package com.hotel.reservation.dto;

/**
 * Shared validation for every imageUrl field. An image reference must be
 * empty, an http(s) URL, or a site-relative path like /images/hotels/a.jpg -
 * never javascript:, data:, file: or a protocol-relative //host URL - and may
 * not contain whitespace or HTML-significant characters.
 */
public final class ImageUrlRules {
    public static final String PATTERN =
            "^$|^https?://[^\\s<>\"']+$|^/[^\\s<>\"'/][^\\s<>\"']*$";
    public static final String MESSAGE =
            "Image must be an http(s) URL or a path starting with a single /";

    private ImageUrlRules() {
    }
}
