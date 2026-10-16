package com.hotel.reservation.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A single amenity line item grouped under a category (Bed, Technology,
 * Bathroom, Accessibility, Kitchen). Rendered by the frontend's
 * RoomAmenitiesSidebar, one section per category.
 */
@Entity
@Table(name = "room_amenities")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoomAmenity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    @JsonIgnoreProperties({"amenities", "hotel", "hibernateLazyInitializer", "handler"})
    private Room room;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AmenityCategory category;

    // e.g. "Bed Room", "Bed Type & Others"
    @Column(nullable = false)
    private String title;

    // e.g. "1 bed room & meeting area", "Double bed, sofa, table & more"
    @Column(columnDefinition = "TEXT")
    private String description;

    // Icon key matched to a lucide-react icon on the frontend
    // (bed, sofa, tv, bath, accessibility, utensils, wifi, etc.)
    private String icon;
}
