package com.hotel.reservation.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "hotels")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Hotel {

    // Falls back to this when a hotel's own commissionRate is null (e.g. a
    // row from before this column existed). Keep in sync with the DB
    // column's DEFAULT in database/schema.sql.
    public static final BigDecimal DEFAULT_COMMISSION_RATE = new BigDecimal("15.00");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String address;
    private String city;
    private String country;
    private String phone;
    private String email;

    @Column(name = "star_rating")
    private Integer starRating;

    @Column(name = "image_url")
    private String imageUrl;

    // Used to plot the hotel on the map (+ directions) on the Hotel Detail page.
    // Nullable - hotels without coordinates just skip the map.
    private Double latitude;
    private Double longitude;

    // The platform's cut of every payment for this hotel, as a percentage
    // (15.00 = 15%) - see PayoutService, which snapshots this rate onto
    // each Payout at the moment of payment so a later rate change never
    // retroactively changes a historical payout. Deliberately @JsonIgnore:
    // GET /api/hotels/** is public, and the commission structure is
    // finance-sensitive - it's only exposed via the dedicated
    // GET/PATCH /api/hotels/{id}/commission-rate endpoints (ADMIN, or that
    // hotel's own owner/staff with VIEW_FINANCE, for the GET).
    @JsonIgnore
    @Column(name = "commission_rate", precision = 5, scale = 2)
    private BigDecimal commissionRate;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "hotel", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Room> rooms = new ArrayList<>();

    @OneToMany(mappedBy = "hotel", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties({"hotel"})
    private List<HotelImage> images = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.commissionRate == null) {
            this.commissionRate = DEFAULT_COMMISSION_RATE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
