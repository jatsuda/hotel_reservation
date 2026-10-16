package com.hotel.reservation.security;

import com.hotel.reservation.exception.TooManyRequestsException;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-account cap on image uploads, so one account (or a stolen token) cannot
 * be used to fill the disk. In-memory, like LoginRateLimiter - move it to a
 * shared store if you run several backend instances.
 */
@Component
public class UploadRateLimiter {

    private static final int MAX_UPLOADS_PER_HOUR = 120;
    private static final long WINDOW_MS = 60L * 60 * 1000;

    private final ConcurrentHashMap<Long, Deque<Long>> hits = new ConcurrentHashMap<>();

    /** Records one upload attempt, or throws {@link TooManyRequestsException} if the account is over its hourly budget. */
    public void checkAndRecord(Long userId) {
        long now = System.currentTimeMillis();
        Deque<Long> queue = hits.computeIfAbsent(userId, k -> new ArrayDeque<>());
        synchronized (queue) {
            while (!queue.isEmpty() && now - queue.peekFirst() > WINDOW_MS) {
                queue.pollFirst();
            }
            if (queue.size() >= MAX_UPLOADS_PER_HOUR) {
                throw new TooManyRequestsException("Too many uploads. Please try again later.");
            }
            queue.addLast(now);
        }
    }
}
