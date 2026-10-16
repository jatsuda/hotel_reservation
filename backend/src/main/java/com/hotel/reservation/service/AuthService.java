package com.hotel.reservation.service;

import com.hotel.reservation.dto.AuthResponse;
import com.hotel.reservation.dto.ChangeEmailRequest;
import com.hotel.reservation.dto.ChangePasswordRequest;
import com.hotel.reservation.dto.LoginRequest;
import com.hotel.reservation.dto.RegisterRequest;
import com.hotel.reservation.entity.Guest;
import com.hotel.reservation.entity.Role;
import com.hotel.reservation.entity.User;
import com.hotel.reservation.exception.BadRequestException;
import com.hotel.reservation.repository.GuestRepository;
import com.hotel.reservation.repository.UserRepository;
import com.hotel.reservation.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final GuestRepository guestRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    /**
     * Public self-service signup - always creates a GUEST-role account plus
     * a linked Guest profile row (used by Reservation.guest). Admin accounts
     * are seeded separately (see DataInitializer) and are never created
     * through this open endpoint.
     */
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new BadRequestException("An account with this email already exists");
        }

        String[] nameParts = request.getFullName().trim().split("\\s+", 2);
        Guest guest = new Guest();
        guest.setFirstName(nameParts[0]);
        guest.setLastName(nameParts.length > 1 ? nameParts[1] : "");
        guest.setEmail(request.getEmail());
        guest.setPhone(request.getPhone());
        guest = guestRepository.save(guest);

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.GUEST);
        user.setGuest(guest);
        user = userRepository.save(user);

        String token = jwtService.generateToken(user);
        return toAuthResponse(user, token);
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (BadCredentialsException e) {
            throw new BadRequestException("Invalid email or password");
        }

        User user = userRepository.findByEmailIgnoreCase(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        String token = jwtService.generateToken(user);
        return toAuthResponse(user, token);
    }

    public AuthResponse toAuthResponse(User user, String token) {
        return new AuthResponse(
                token,
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                user.getGuest() != null ? user.getGuest().getId() : null,
                user.getHotel() != null ? user.getHotel().getId() : null,
                user.getPermissions()
        );
    }

    /**
     * Lets any logged-in account (used mainly by HOTEL_OWNER accounts, which
     * start out on a shared temporary password - see DataInitializer) set
     * their own new password after confirming the current one.
     */
    public void changePassword(User currentUser, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.getCurrentPassword(), currentUser.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }
        currentUser.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(currentUser);
    }

    /**
     * Lets any logged-in account change its own login email, after
     * confirming the current password. The JWT's subject is the email (see
     * JwtService), so the token the caller was using becomes invalid the
     * moment this saves - a fresh token is issued in the response so the
     * frontend can keep the session going without a full re-login.
     */
    public AuthResponse changeEmail(User currentUser, ChangeEmailRequest request) {
        if (!passwordEncoder.matches(request.getCurrentPassword(), currentUser.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }
        if (!request.getNewEmail().equalsIgnoreCase(currentUser.getEmail())
                && userRepository.existsByEmailIgnoreCase(request.getNewEmail())) {
            throw new BadRequestException("An account with this email already exists");
        }
        currentUser.setEmail(request.getNewEmail());
        userRepository.save(currentUser);

        String token = jwtService.generateToken(currentUser);
        return toAuthResponse(currentUser, token);
    }
}
