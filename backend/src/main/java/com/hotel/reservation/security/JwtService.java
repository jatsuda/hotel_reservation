package com.hotel.reservation.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Date;
import java.util.function.Function;

/**
 * Issues and validates the JWT access tokens used by every authenticated
 * request. The token carries the user's email (as subject) and role, and is
 * verified on each request by {@link JwtAuthenticationFilter}.
 *
 * The signing secret comes from the JWT_SECRET environment variable (property
 * jwt.secret). There is no hard-coded fallback: a missing secret is replaced by
 * a random one generated at startup, and a weak / known-default secret makes
 * the application refuse to start.
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    // The placeholder that used to ship in application.properties - anyone who
    // downloaded the project knows it, so it must never be accepted as a secret.
    private static final String LEGACY_DEFAULT_SECRET =
            "change-this-dev-secret-key-please-use-something-longer-and-random-1234567890";

    @Value("${jwt.secret:}")
    private String secret;

    @Value("${jwt.expiration-ms}")
    private long expirationMs;

    private SecretKey signingKey;

    @PostConstruct
    void init() {
        byte[] keyBytes;
        if (secret == null || secret.isBlank()) {
            byte[] random = new byte[64];
            new SecureRandom().nextBytes(random);
            keyBytes = Base64.getEncoder().encodeToString(random).getBytes(StandardCharsets.UTF_8);
            log.warn("JWT_SECRET is not set - generated a random signing key for this run. "
                    + "Set JWT_SECRET (e.g. `openssl rand -base64 48`) for any real deployment.");
        } else {
            keyBytes = secret.getBytes(StandardCharsets.UTF_8);
            if (LEGACY_DEFAULT_SECRET.equals(secret)) {
                throw new IllegalStateException(
                        "jwt.secret is set to the publicly known default value. Set JWT_SECRET to a new random value.");
            }
            if (keyBytes.length < 32) {
                throw new IllegalStateException(
                        "jwt.secret must be at least 32 bytes long (HS256). Set JWT_SECRET to a longer random value.");
            }
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(UserDetails userDetails) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(userDetails.getUsername())
                .claim("role", userDetails.getAuthorities().iterator().next().getAuthority())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey)
                .compact();
    }

    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            String email = extractEmail(token);
            return email.equalsIgnoreCase(userDetails.getUsername()) && !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    private <T> T extractClaim(String token, Function<Claims, T> resolver) {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return resolver.apply(claims);
    }
}
