package com.hotel.reservation.config;

import com.hotel.reservation.security.CustomUserDetailsService;
import com.hotel.reservation.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Central security configuration: stateless JWT auth (no server-side
 * sessions), BCrypt password hashing, CORS for the Next.js frontend, and the
 * route-level authorization matrix described in the README.
 *
 * Route summary:
 *  - Public: auth endpoints, browsing hotels/rooms, upcoming reservations by room,
 *    a hotel's reviews and rating summary
 *  - Authenticated (GUEST, HOTEL_OWNER, HOTEL_STAFF or ADMIN): booking, payments, own reservations/profile
 *  - ADMIN, HOTEL_OWNER or HOTEL_STAFF: editing hotels/rooms, listing/managing reservations
 *    - narrowed to "their own hotel only", and further to whichever specific
 *      Permission(s) a HOTEL_STAFF account was granted, in the service layer
 *      (see CurrentUserProvider)
 *    - viewing (never editing) that hotel's commission rate and payouts
 *      additionally requires VIEW_FINANCE specifically
 *  - ADMIN or HOTEL_OWNER: managing that hotel's HOTEL_STAFF accounts (/api/staff)
 *  - ADMIN only: creating/deleting hotels, guest directory, deleting reservations,
 *    payments management, setting a hotel's commission rate, and recording payouts as paid
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    // Comma-separated list, e.g. "http://localhost:3000,https://my-app.vercel.app".
    // Override via app.cors.allowed-origins (or the APP_CORS_ALLOWED_ORIGINS
    // env var) when deploying the frontend to its own domain.
    @Value("${app.cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(
                java.util.Arrays.stream(allowedOrigins.split(","))
                        .map(String::trim)
                        .filter(origin -> !origin.isEmpty())
                        .toList()
        );
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        // Only the headers the frontend actually sends - not a wildcard.
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        config.setMaxAge(3600L);
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(authenticationProvider())
            // This server only returns JSON, so lock the browser-side defaults
            // down: no framing, no sniffing, no referrer leakage, nothing
            // loadable from any API response. (HSTS is added automatically on
            // HTTPS requests.)
            .headers(headers -> headers
                .frameOptions(frame -> frame.deny())
                .contentTypeOptions(Customizer.withDefaults())
                .referrerPolicy(ref -> ref.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'"))
            )
            .exceptionHandling(exception -> exception
                // Fired when an unauthenticated request hits a protected endpoint -
                // without this, Spring Security returns an empty 401/403 body
                // instead of the JSON shape the frontend expects.
                .authenticationEntryPoint((request, response, authException) ->
                    writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized",
                            "Authentication required", request.getRequestURI()))
                // Fired when an authenticated user lacks the required role.
                .accessDeniedHandler((request, response, accessDeniedException) ->
                    writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Forbidden",
                            "You do not have permission to perform this action", request.getRequestURI()))
            )
            .authorizeHttpRequests(auth -> auth
                // Preflight
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Public: auth endpoints
                .requestMatchers("/api/auth/**").permitAll()

                // Finance-sensitive, so these must be checked before the
                // public GET /api/hotels/** rule below (first match wins) -
                // otherwise a hotel's commission rate would leak publicly.
                // ADMIN can view/edit any hotel's rate; HOTEL_OWNER/HOTEL_STAFF
                // can only view their own (HotelService requires VIEW_FINANCE),
                // and can never edit it (HotelService.updateCommissionRate is ADMIN-only).
                .requestMatchers(HttpMethod.GET, "/api/hotels/*/commission-rate").hasAnyRole("ADMIN", "HOTEL_OWNER", "HOTEL_STAFF")
                .requestMatchers(HttpMethod.PATCH, "/api/hotels/*/commission-rate").hasRole("ADMIN")

                // Public: browsing hotels & rooms, and room availability
                .requestMatchers(HttpMethod.GET, "/api/hotels", "/api/hotels/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/rooms", "/api/rooms/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/reservations/room/*/upcoming").permitAll()

                // Public: uploaded hotel/room photos (served from disk by WebConfig).
                .requestMatchers(HttpMethod.GET, "/uploads/images/**").permitAll()

                // Uploading a photo: same people who can edit hotels/rooms.
                // Whether they may attach it to a given hotel/room is enforced
                // when that hotel/room is saved (HotelService/RoomService).
                .requestMatchers(HttpMethod.POST, "/api/uploads/**").hasAnyRole("ADMIN", "HOTEL_OWNER", "HOTEL_STAFF")

                // Public: a hotel's reviews and its average-rating summary
                // (shown on the Hotel Detail page to anyone, logged in or not).
                .requestMatchers(HttpMethod.GET, "/api/reviews/hotel/**").permitAll()

                // Hotel management: creating/deleting hotels stays ADMIN-only
                // (there are a fixed 20 hotels, owned - not created - by
                // HOTEL_OWNER accounts). Editing a hotel's own details is
                // open to ADMIN, HOTEL_OWNER or HOTEL_STAFF;
                // HotelService.updateHotel then narrows this down to only
                // their own linked hotel (and, for HOTEL_STAFF, requires the
                // MANAGE_HOTEL_INFO permission specifically).
                .requestMatchers(HttpMethod.POST, "/api/hotels/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/hotels/**").hasAnyRole("ADMIN", "HOTEL_OWNER", "HOTEL_STAFF")
                .requestMatchers(HttpMethod.DELETE, "/api/hotels/**").hasRole("ADMIN")

                // Room management: ADMIN, HOTEL_OWNER, or a HOTEL_STAFF with
                // the MANAGE_ROOMS permission (own hotel's rooms only -
                // enforced in RoomService via CurrentUserProvider).
                .requestMatchers(HttpMethod.POST, "/api/rooms/**").hasAnyRole("ADMIN", "HOTEL_OWNER", "HOTEL_STAFF")
                .requestMatchers(HttpMethod.PUT, "/api/rooms/**").hasAnyRole("ADMIN", "HOTEL_OWNER", "HOTEL_STAFF")
                .requestMatchers(HttpMethod.PATCH, "/api/rooms/**").hasAnyRole("ADMIN", "HOTEL_OWNER", "HOTEL_STAFF")
                .requestMatchers(HttpMethod.DELETE, "/api/rooms/**").hasAnyRole("ADMIN", "HOTEL_OWNER", "HOTEL_STAFF")

                // Admin-only: guest directory management
                .requestMatchers("/api/guests/**").hasRole("ADMIN")

                // Managing a hotel's own HOTEL_STAFF accounts is owner/admin
                // only - a HOTEL_STAFF account can never add/edit/remove
                // other staff (StaffService.canManageStaff enforces this
                // even if this route check were ever loosened).
                .requestMatchers("/api/staff/**").hasAnyRole("ADMIN", "HOTEL_OWNER")

                // Reservation management: ADMIN sees/manages everything;
                // HOTEL_OWNER and HOTEL_STAFF are scoped to their own
                // hotel's reservations, and a HOTEL_STAFF additionally needs
                // VIEW_FINANCE (to list/view) or MANAGE_RESERVATIONS (to
                // act) - see ReservationService.getReservations/assertOwnerOrAdmin.
                // Deleting a reservation record outright stays ADMIN-only -
                // a HOTEL_OWNER/HOTEL_STAFF uses cancel/check-in/check-out instead.
                .requestMatchers(HttpMethod.GET, "/api/reservations").hasAnyRole("ADMIN", "HOTEL_OWNER", "HOTEL_STAFF")
                .requestMatchers(HttpMethod.PUT, "/api/reservations/**").hasAnyRole("ADMIN", "HOTEL_OWNER", "HOTEL_STAFF")
                .requestMatchers(HttpMethod.DELETE, "/api/reservations/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/reservations/*/check-in").hasAnyRole("ADMIN", "HOTEL_OWNER", "HOTEL_STAFF")
                .requestMatchers(HttpMethod.POST, "/api/reservations/*/check-out").hasAnyRole("ADMIN", "HOTEL_OWNER", "HOTEL_STAFF")
                .requestMatchers(HttpMethod.GET, "/api/payments").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/payments/**").hasRole("ADMIN")

                // Payouts (platform -> hotel, net of commission): ADMIN sees
                // and manages everything; a hotel's own HOTEL_OWNER/HOTEL_STAFF
                // can view (with VIEW_FINANCE) but never record a transfer
                // themselves - PayoutService enforces both narrowings.
                .requestMatchers(HttpMethod.GET, "/api/payouts/hotel/**").hasAnyRole("ADMIN", "HOTEL_OWNER", "HOTEL_STAFF")
                .requestMatchers(HttpMethod.GET, "/api/payouts/summary").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/payouts").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/payouts/*/pay").hasRole("ADMIN")

                // Everything else under /api requires a logged-in user
                // (booking, payments, own reservation actions - ownership is
                // enforced in the service layer, see ReservationService/PaymentService)
                .requestMatchers("/api/**").authenticated()

                // Spring Boot's own error dispatch must stay reachable so
                // error bodies render; everything else outside /api is closed
                // (default-deny) instead of being silently public.
                .requestMatchers("/error").permitAll()
                .anyRequest().denyAll()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private void writeJsonError(HttpServletResponse response, int status, String error, String message, String path) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        String json = String.format(
                "{\"timestamp\":\"%s\",\"status\":%d,\"error\":\"%s\",\"message\":\"%s\",\"path\":\"%s\"}",
                LocalDateTime.now(), status, escapeJson(error), escapeJson(message), escapeJson(path)
        );
        response.getWriter().write(json);
    }

    // The request path is attacker-controlled; escape it before it goes into
    // a hand-built JSON string.
    private static String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder(value.length() + 8);
        for (char c : value.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }
}
