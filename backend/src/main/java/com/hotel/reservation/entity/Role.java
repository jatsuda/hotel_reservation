package com.hotel.reservation.entity;

public enum Role {
    ADMIN,
    // Manages exactly one Hotel (see User.hotel) - full CRUD on that hotel's
    // own details, rooms, and reservations, enforced in the service layer.
    HOTEL_OWNER,
    // An internal team member a HOTEL_OWNER added to help run their hotel
    // (marketing, finance, sales, room management, etc). Also linked to
    // exactly one Hotel via User.hotel, but only has the specific
    // User.permissions the owner granted - see entity/Permission.java and
    // CurrentUserProvider for how those are checked.
    HOTEL_STAFF,
    GUEST
}
