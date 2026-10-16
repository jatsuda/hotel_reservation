package com.hotel.reservation.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.HashMap;
import java.util.Map;

/**
 * Centralised error handling so every API endpoint returns a
 * consistent, readable JSON error body instead of a raw stack trace.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex, HttpServletRequest req) {
        ErrorResponse body = new ErrorResponse(HttpStatus.NOT_FOUND.value(), "Not Found", ex.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException ex, HttpServletRequest req) {
        ErrorResponse body = new ErrorResponse(HttpStatus.BAD_REQUEST.value(), "Bad Request", ex.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(RoomNotAvailableException.class)
    public ResponseEntity<ErrorResponse> handleRoomNotAvailable(RoomNotAvailableException ex, HttpServletRequest req) {
        ErrorResponse body = new ErrorResponse(HttpStatus.CONFLICT.value(), "Room Not Available", ex.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest req) {
        ErrorResponse body = new ErrorResponse(HttpStatus.FORBIDDEN.value(), "Forbidden", ex.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    @ExceptionHandler({AuthenticationException.class, BadCredentialsException.class})
    public ResponseEntity<ErrorResponse> handleAuthentication(Exception ex, HttpServletRequest req) {
        ErrorResponse body = new ErrorResponse(HttpStatus.UNAUTHORIZED.value(), "Unauthorized", "Invalid credentials or missing authentication", req.getRequestURI());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }
        ErrorResponse body = new ErrorResponse(HttpStatus.BAD_REQUEST.value(), "Validation Failed", "One or more fields are invalid", req.getRequestURI());
        body.setValidationErrors(fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<ErrorResponse> handleTooManyRequests(TooManyRequestsException ex, HttpServletRequest req) {
        ErrorResponse body = new ErrorResponse(HttpStatus.TOO_MANY_REQUESTS.value(), "Too Many Requests", ex.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, "900")
                .body(body);
    }

    // Malformed JSON, wrong enum value, wrong date format, etc. - the raw
    // parser message can echo internal class names, so send a fixed one.
    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ErrorResponse> handleUnreadable(Exception ex, HttpServletRequest req) {
        ErrorResponse body = new ErrorResponse(HttpStatus.BAD_REQUEST.value(), "Bad Request", "Malformed or invalid request", req.getRequestURI());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex, HttpServletRequest req) {
        log.warn("Data integrity violation on {}: {}", req.getRequestURI(), ex.getMostSpecificCause().getMessage());
        ErrorResponse body = new ErrorResponse(HttpStatus.CONFLICT.value(), "Conflict",
                "The request conflicts with existing data", req.getRequestURI());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleUploadTooLarge(Exception ex, HttpServletRequest req) {
        ErrorResponse body = new ErrorResponse(HttpStatus.PAYLOAD_TOO_LARGE.value(), "Payload Too Large",
                "Image is too large (max 8 MB)", req.getRequestURI());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(body);
    }

    // Last resort. The real exception goes to the server log only - never to
    // the client (messages can contain SQL, class names, file paths...).
    // Spring MVC's own 4xx exceptions (405 Method Not Allowed, 415, 404 for an
    // unknown path...) implement org.springframework.web.ErrorResponse; keep
    // their status instead of turning them into a 500.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex, HttpServletRequest req) {
        if (ex instanceof org.springframework.web.ErrorResponse springError) {
            HttpStatusCode status = springError.getStatusCode();
            HttpStatus resolved = HttpStatus.resolve(status.value());
            String reason = resolved != null ? resolved.getReasonPhrase() : "Error";
            ErrorResponse body = new ErrorResponse(status.value(), reason, reason, req.getRequestURI());
            return ResponseEntity.status(status).body(body);
        }
        log.error("Unhandled exception on {} {}", req.getMethod(), req.getRequestURI(), ex);
        ErrorResponse body = new ErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR.value(), "Internal Server Error",
                "Something went wrong. Please try again later.", req.getRequestURI());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
