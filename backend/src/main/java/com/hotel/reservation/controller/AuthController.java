package com.hotel.reservation.controller;

import com.hotel.reservation.dto.AuthResponse;
import com.hotel.reservation.dto.ChangeEmailRequest;
import com.hotel.reservation.dto.ChangePasswordRequest;
import com.hotel.reservation.dto.LoginRequest;
import com.hotel.reservation.dto.RegisterRequest;
import com.hotel.reservation.entity.User;
import com.hotel.reservation.exception.BadRequestException;
import com.hotel.reservation.security.CurrentUserProvider;
import com.hotel.reservation.security.LoginRateLimiter;
import com.hotel.reservation.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final CurrentUserProvider currentUserProvider;
    private final LoginRateLimiter loginRateLimiter;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String ip = httpRequest.getRemoteAddr();
        String email = request.getEmail();

        // Throws 429 when this client already burned its failed-attempt budget.
        loginRateLimiter.checkAllowed(ip, email);
        try {
            AuthResponse response = authService.login(request);
            loginRateLimiter.recordSuccess(ip, email);
            return ResponseEntity.ok(response);
        } catch (BadRequestException e) {
            loginRateLimiter.recordFailure(ip, email);
            throw e;
        }
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me() {
        User user = currentUserProvider.getCurrentUser();
        // No real token needed in the response body here - the frontend
        // already holds a valid token if this call succeeded.
        return ResponseEntity.ok(authService.toAuthResponse(user, ""));
    }

    @PutMapping("/change-password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        User user = currentUserProvider.getCurrentUser();
        authService.changePassword(user, request);
        return ResponseEntity.noContent().build();
    }

    // Returns a fresh AuthResponse (with a new token) since the old token's
    // embedded email no longer matches any account once this saves - see
    // AuthService.changeEmail.
    @PutMapping("/change-email")
    public ResponseEntity<AuthResponse> changeEmail(@Valid @RequestBody ChangeEmailRequest request) {
        User user = currentUserProvider.getCurrentUser();
        return ResponseEntity.ok(authService.changeEmail(user, request));
    }
}
