package com.hotel.reservation.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

/**
 * An additional gallery photo for a room, beyond the main photo stored on
 * Room.imageUrl. Shown as the thumbnail strip on the Room Detail page.
 */
@Entity
@Table(name = "room_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoomImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Room room;

    // Optional caption, e.g. "Bathroom", "Balcony view"
    private String label;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    // Controls the order of the thumbnails
    @Column(name = "sort_order")
    private Integer sortOrder = 0;
}
