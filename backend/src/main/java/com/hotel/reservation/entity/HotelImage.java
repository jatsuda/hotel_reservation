package com.hotel.reservation.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * An additional gallery photo for a hotel, beyond the single "card" image
 * stored on Hotel.imageUrl. Rendered on the Hotel Detail page's gallery
 * (the "Family Room" / "Bathroom" / "Facility" thumbnail slots).
 */
@Entity
@Table(name = "hotel_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HotelImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hotel_id", nullable = false)
    @JsonIgnoreProperties({"images", "rooms", "hibernateLazyInitializer", "handler"})
    private Hotel hotel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HotelImageCategory category;

    // Display caption, e.g. "Family Room", "Rooftop Pool", "Deluxe Bathroom"
    private String label;

    @Column(name = "image_url", nullable = false)
    private String imageUrl;

    // Controls left-to-right / top-to-bottom order in the gallery
    @Column(name = "sort_order")
    private Integer sortOrder = 0;
}
