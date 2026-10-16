package com.hotel.reservation.security;

import com.hotel.reservation.exception.TooManyRequestsException;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Small in-memory brute-force guard for POST /api/auth/login.
 *
 * Failed attempts are counted in a sliding-ish window, both per (client IP +
 * email) pair - so one attacker can't lock a victim out from other networks -
 * and per client IP overall, which slows credential stuffing across many
 * emails. A successful login clears the (IP + email) counter.
 *
 * State lives in this JVM only; if you run several backend instances behind a
 * load balancer, move this to a shared store (Redis) or an API gateway rule.
 * If you sit behind a reverse proxy, set server.forward-headers-strategy so
 * request.getRemoteAddr() is the real client address.
 */
@Component
public class LoginRateLimiter {

    private static final int MAX_FAILURES_PER_IP_AND_EMAIL = 5;
    private static final int MAX_FAILURES_PER_IP = 30;
    private static final long WINDOW_MS = 15L * 60 * 1000;
    private static final int MAX_TRACKED_KEYS = 20_000;

    private static final class Counter {
        int failures;
        long windowStart;
    }

    private final ConcurrentHashMap<String, Counter> counters = new ConcurrentHashMap<>();

    /** Throws {@link TooManyRequestsException} if this client is currently locked out. */
    public void checkAllowed(String ip, String email) {
        if (isLocked(pairKey(ip, email), MAX_FAILURES_PER_IP_AND_EMAIL)
                || isLocked(ipKey(ip), MAX_FAILURES_PER_IP)) {
            throw new TooManyRequestsException("Too many failed login attempts. Please try again in a few minutes.");
        }
    }

    public void recordFailure(String ip, String email) {
        purgeIfLarge();
        increment(pairKey(ip, email));
        increment(ipKey(ip));
    }

    public void recordSuccess(String ip, String email) {
        counters.remove(pairKey(ip, email));
    }

    private boolean isLocked(String key, int max) {
        Counter c = counters.get(key);
        if (c == null) {
            return false;
        }
        synchronized (c) {
            if (System.currentTimeMillis() - c.windowStart > WINDOW_MS) {
                counters.remove(key, c);
                return false;
            }
            return c.failures >= max;
        }
    }

    private void increment(String key) {
        long now = System.currentTimeMillis();
        Counter c = counters.computeIfAbsent(key, k -> {
            Counter fresh = new Counter();
            fresh.windowStart = now;
            return fresh;
        });
        synchronized (c) {
            if (now - c.windowStart > WINDOW_MS) {
                c.windowStart = now;
                c.failures = 0;
            }
            c.failures++;
        }
    }

    private void purgeIfLarge() {
        if (counters.size() < MAX_TRACKED_KEYS) {
            return;
        }
        long now = System.currentTimeMillis();
        counters.entrySet().removeIf(e -> now - e.getValue().windowStart > WINDOW_MS);
        if (counters.size() >= MAX_TRACKED_KEYS) {
            counters.clear();
        }
    }

    private static String pairKey(String ip, String email) {
        return "pair:" + ip + "|" + (email == null ? "" : email.trim().toLowerCase());
    }

    private static String ipKey(String ip) {
        return "ip:" + ip;
    }
}
