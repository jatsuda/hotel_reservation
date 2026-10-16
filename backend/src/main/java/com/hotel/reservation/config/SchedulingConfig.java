package com.hotel.reservation.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Enables @Scheduled jobs (currently: OrphanImageCleaner). */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
