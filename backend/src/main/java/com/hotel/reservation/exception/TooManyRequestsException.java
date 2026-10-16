package com.hotel.reservation.exception;

/** Thrown when a client exceeds a rate limit (mapped to HTTP 429). */
public class TooManyRequestsException extends RuntimeException {
    public TooManyRequestsException(String message) {
        super(message);
    }
}
