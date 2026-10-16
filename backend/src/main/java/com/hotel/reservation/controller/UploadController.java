package com.hotel.reservation.controller;

import com.hotel.reservation.entity.User;
import com.hotel.reservation.security.CurrentUserProvider;
import com.hotel.reservation.security.UploadRateLimiter;
import com.hotel.reservation.service.ImageStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Image upload for the admin screens (hotel main photo, hotel gallery, room
 * photos). Returns the public URL of the stored file, which the frontend then
 * saves into the normal imageUrl fields.
 *
 * Who may upload: an ADMIN; a HOTEL_OWNER linked to a hotel; or a HOTEL_STAFF
 * linked to a hotel who holds MANAGE_HOTEL_INFO or MANAGE_ROOMS (the only two
 * permissions that involve photos). Uploads are also rate-limited per account.
 * Whether an uploaded photo may be attached to a given hotel/room is still
 * decided by HotelService/RoomService when that hotel/room is saved.
 */
@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
public class UploadController {

    private final ImageStorageService imageStorageService;
    private final CurrentUserProvider currentUserProvider;
    private final UploadRateLimiter uploadRateLimiter;

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file) {
        if (!currentUserProvider.canUploadImages()) {
            throw new AccessDeniedException("You do not have permission to upload images");
        }
        User user = currentUserProvider.getCurrentUser();
        uploadRateLimiter.checkAndRecord(user.getId());

        String url = imageStorageService.store(file);
        return ResponseEntity.ok(Map.of("url", url));
    }
}
