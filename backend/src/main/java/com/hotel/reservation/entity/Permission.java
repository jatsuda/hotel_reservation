package com.hotel.reservation.entity;

/**
 * Fine-grained permissions a hotel owner can grant to a HOTEL_STAFF account
 * on their own hotel (see User.permissions). An ADMIN or HOTEL_OWNER always
 * has every permission implicitly on the hotel(s) they're allowed to touch -
 * this enum only matters for narrowing down a HOTEL_STAFF account.
 *
 * These map onto the "departments" a hotel owner would naturally think in
 * (marketing, finance, sales, room/data management), but are stored as
 * individual flags so an owner can mix and match rather than being stuck
 * with fixed job titles - the frontend offers department presets that just
 * pre-check the relevant flags.
 */
public enum Permission {
    // Edit the hotel's own listing: description, address, images, star
    // rating, etc. - the "marketing"/public-facing side of the hotel.
    MANAGE_HOTEL_INFO,
    // Create/edit/delete rooms, pricing, and room status - "data & room management".
    MANAGE_ROOMS,
    // Confirm, check guests in/out, and cancel reservations - "sales & bookings".
    MANAGE_RESERVATIONS,
    // Read-only: view the hotel's reservations and their payment/revenue
    // info without being able to change anything - "finance".
    VIEW_FINANCE
}
