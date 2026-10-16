package com.hotel.reservation.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Removes uploaded photos that no hotel/room points to any more (for example
 * a photo that was uploaded and then removed from the form before saving, or
 * replaced by another one). Runs nightly.
 *
 * Safety: only files that look like our own upload names are considered, a
 * file must be older than the grace period (so a photo uploaded a moment ago
 * and not yet saved is never touched), and if the database cannot be read the
 * run is skipped entirely.
 */
@Component
@RequiredArgsConstructor
public class OrphanImageCleaner {

    private static final Logger log = LoggerFactory.getLogger(OrphanImageCleaner.class);
    private static final Pattern OUR_FILE =
            Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png)$");
    private static final List<String> URL_COLUMNS = List.of(
            "SELECT image_url FROM hotels WHERE image_url IS NOT NULL",
            "SELECT image_url FROM hotel_images WHERE image_url IS NOT NULL",
            "SELECT image_url FROM rooms WHERE image_url IS NOT NULL",
            "SELECT image_url FROM room_images WHERE image_url IS NOT NULL");

    private final ImageStorageService imageStorageService;
    private final JdbcTemplate jdbcTemplate;

    @Value("${app.upload.cleanup-enabled:true}")
    private boolean enabled;

    @Value("${app.upload.cleanup-grace-hours:24}")
    private long graceHours;

    @Scheduled(cron = "${app.upload.cleanup-cron:0 30 3 * * *}")
    public void cleanOrphans() {
        if (!enabled) {
            return;
        }

        Set<String> referenced = new HashSet<>();
        try {
            for (String sql : URL_COLUMNS) {
                jdbcTemplate.query(sql, (RowCallbackHandler) rs -> {
                    String url = rs.getString(1);
                    int slash = url.lastIndexOf('/');
                    referenced.add(slash >= 0 ? url.substring(slash + 1) : url);
                });
            }
        } catch (RuntimeException e) {
            log.warn("Orphan image cleanup skipped - could not read image references: {}", e.getMessage());
            return;
        }

        Instant cutoff = Instant.now().minus(Duration.ofHours(graceHours));
        int removed = 0;
        try (Stream<Path> files = Files.list(imageStorageService.getRoot())) {
            for (Path file : (Iterable<Path>) files::iterator) {
                String name = file.getFileName().toString();
                if (!OUR_FILE.matcher(name).matches() || referenced.contains(name)) {
                    continue;
                }
                try {
                    if (Files.isRegularFile(file) && Files.getLastModifiedTime(file).toInstant().isBefore(cutoff)) {
                        Files.delete(file);
                        removed++;
                    }
                } catch (IOException e) {
                    log.warn("Could not delete orphan image {}: {}", name, e.getMessage());
                }
            }
        } catch (IOException e) {
            log.warn("Orphan image cleanup failed to list uploads: {}", e.getMessage());
            return;
        }
        if (removed > 0) {
            log.info("Orphan image cleanup removed {} unused file(s).", removed);
        }
    }
}
