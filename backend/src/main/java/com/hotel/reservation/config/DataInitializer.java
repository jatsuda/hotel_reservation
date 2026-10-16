package com.hotel.reservation.config;

import com.hotel.reservation.entity.Guest;
import com.hotel.reservation.entity.Hotel;
import com.hotel.reservation.entity.Role;
import com.hotel.reservation.entity.User;
import com.hotel.reservation.repository.GuestRepository;
import com.hotel.reservation.repository.HotelRepository;
import com.hotel.reservation.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Seeds login-ready accounts on startup, without touching database/schema.sql
 * (which stays plain SQL and knows nothing about password hashing). This
 * runs every time the app starts but is idempotent - it only creates a user
 * if one doesn't already exist for that email.
 *
 * Accounts created (emails and demo passwords are documented in README.md,
 * section "Demo accounts" - deliberately NOT repeated here or in the UI):
 *   - one ADMIN account (always)
 *   - guest1..guest3 GUEST accounts, linked to the Guest rows seeded in schema.sql
 *     (only when app.seed.demo-accounts=true)
 *   - owner1..ownerN HOTEL_OWNER accounts, one per hotel seeded by
 *     database/schema.sql, matched by hotel id in insertion order
 *     (only when app.seed.demo-accounts=true)
 *
 * Passwords can be overridden with APP_SEED_ADMIN_PASSWORD / APP_SEED_GUEST_PASSWORD /
 * APP_SEED_OWNER_PASSWORD. In production set APP_SEED_DEMO_ACCOUNTS=false and give the
 * admin a strong password. Seeded passwords are never written to the log.
 *
 * All HOTEL_OWNER accounts share one temporary password on purpose - each hotel
 * should change it after first login via PUT /api/auth/change-password
 * (frontend: /account/password).
 */
@Slf4j
@Component
@RequiredArgsConstructor
@Transactional
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final GuestRepository guestRepository;
    private final HotelRepository hotelRepository;
    private final PasswordEncoder passwordEncoder;

    // Demo fallbacks, used only when the matching APP_SEED_*_PASSWORD property
    // is empty. They are documented in README.md.
    private static final String DEFAULT_GUEST_PASSWORD = "guest123";
    private static final String DEFAULT_ADMIN_PASSWORD = "admin123";
    // Shared temporary password for every seeded HOTEL_OWNER account - hotels
    // are expected to change this on first login.
    private static final String TEMP_OWNER_PASSWORD = "Owner@2026!";

    @Value("${app.seed.demo-accounts:true}")
    private boolean seedDemoAccounts;

    @Value("${app.seed.admin-password:}")
    private String configuredAdminPassword;

    @Value("${app.seed.guest-password:}")
    private String configuredGuestPassword;

    @Value("${app.seed.owner-password:}")
    private String configuredOwnerPassword;

    private String adminPassword() {
        return configuredAdminPassword == null || configuredAdminPassword.isBlank()
                ? DEFAULT_ADMIN_PASSWORD : configuredAdminPassword;
    }

    private String guestPassword() {
        return configuredGuestPassword == null || configuredGuestPassword.isBlank()
                ? DEFAULT_GUEST_PASSWORD : configuredGuestPassword;
    }

    private String ownerPassword() {
        return configuredOwnerPassword == null || configuredOwnerPassword.isBlank()
                ? TEMP_OWNER_PASSWORD : configuredOwnerPassword;
    }

    @Override
    public void run(String... args) {
        seedAdmin();
        if (!seedDemoAccounts) {
            log.info("Demo accounts disabled (app.seed.demo-accounts=false) - skipping guest/owner seeding.");
            return;
        }
        log.warn("Demo accounts are enabled (app.seed.demo-accounts=true). "
                + "Set APP_SEED_DEMO_ACCOUNTS=false before deploying this anywhere public.");
        seedTestGuest("guest1@test.com", "Guest One");
        seedTestGuest("guest2@test.com", "Guest Two");
        seedTestGuest("guest3@test.com", "Guest Three");
        seedHotelOwners();
    }

    private void seedAdmin() {
        if (userRepository.existsByEmailIgnoreCase("admin@hotel.com")) {
            return;
        }
        User admin = new User();
        admin.setFullName("System Admin");
        admin.setEmail("admin@hotel.com");
        admin.setPassword(passwordEncoder.encode(adminPassword()));
        admin.setRole(Role.ADMIN);
        userRepository.save(admin);
        if (configuredAdminPassword == null || configuredAdminPassword.isBlank()) {
            log.warn("The ADMIN account was created with the well-known demo password. "
                    + "Set APP_SEED_ADMIN_PASSWORD (before first start) or change it immediately.");
        }
    }

    /**
     * Links a login (User row) to the Guest row already seeded by
     * database/schema.sql, matched by email. If no such Guest exists yet
     * (e.g. schema.sql wasn't run and ddl-auto=update created empty tables),
     * a fresh Guest profile is created so the account still works end to end.
     */
    private void seedTestGuest(String email, String fullName) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            return;
        }

        Optional<Guest> existingGuest = guestRepository.findByEmailIgnoreCase(email);
        Guest guest = existingGuest.orElseGet(() -> {
            Guest g = new Guest();
            String[] parts = fullName.split(" ", 2);
            g.setFirstName(parts[0]);
            g.setLastName(parts.length > 1 ? parts[1] : "");
            g.setEmail(email);
            g.setPhone("+66-80-000-0000");
            return guestRepository.save(g);
        });

        User user = new User();
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(guestPassword()));
        user.setRole(Role.GUEST);
        user.setGuest(guest);
        userRepository.save(user);
    }

    /**
     * One HOTEL_OWNER account per hotel already present in the database,
     * ordered by hotel id (1..N, matching the insertion order of the 20
     * hotels in database/schema.sql). If schema.sql hasn't been run yet
     * (ddl-auto=update alone only creates empty tables), there are no
     * hotels to attach owners to - this logs a warning and skips instead
     * of failing startup, and will pick the owners up automatically on a
     * later restart once the hotels exist.
     */
    private void seedHotelOwners() {
        List<Hotel> hotels = hotelRepository.findAll();
        if (hotels.isEmpty()) {
            log.warn("No hotels found - skipping HOTEL_OWNER seeding. Run database/schema.sql "
                    + "to seed the 20 hotels, then restart the backend to create their owner accounts.");
            return;
        }

        hotels.sort((a, b) -> Long.compare(a.getId(), b.getId()));

        int index = 0;
        for (Hotel hotel : hotels) {
            index++;
            String email = "owner" + index + "@hotel.com";
            if (userRepository.existsByEmailIgnoreCase(email)) {
                continue;
            }
            User owner = new User();
            owner.setFullName(hotel.getName() + " - Owner");
            owner.setEmail(email);
            owner.setPassword(passwordEncoder.encode(ownerPassword()));
            owner.setRole(Role.HOTEL_OWNER);
            owner.setHotel(hotel);
            userRepository.save(owner);
        }

        log.info("Checked/seeded HOTEL_OWNER accounts for {} hotel(s) (owner1@hotel.com .. owner{}@hotel.com).",
                hotels.size(), hotels.size());
    }
}
