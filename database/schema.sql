-- =========================================================
-- Hotel Reservation System - Database Schema & Seed Data (MySQL)
-- =========================================================
-- This file is provided for reference / manual setup.
-- If you run the Spring Boot backend with
--   spring.jpa.hibernate.ddl-auto=update
-- Hibernate will create these tables automatically from the
-- JPA entities the first time you start the app. You can still
-- run this file to (re)create the schema manually or to seed
-- test data into an existing database.
--
-- WARNING: this file DROPS and recreates every table below, so re-running
-- it deletes ALL existing data in them. Run it on a fresh/dev database.
--
-- Seed data = the same data as database/schema-supabase.sql (the PostgreSQL
-- version for Supabase), written for MySQL 5.7+/8.x:
--   * 20 REAL Thai hotels (5 each in Bangkok, Chiang Mai, Phuket, Pattaya)
--     with real addresses and latitude/longitude, which the Hotel Detail
--     page uses to draw the Longdo map pin. Coordinates come from public
--     hotel/travel listings and are accurate to roughly 100-300 m - good for
--     a map pin, not for surveying. Descriptions are written fresh for this
--     project. Phone numbers are filled in only where a public listing was
--     found; e-mail is left empty on purpose.
--   * Prices (rooms.price_per_night) are in USD, like before - the frontend
--     converts to THB (lib/currency.ts, 1 USD = 35 THB).
--   * The sample reservations / payments / reviews / payouts are DEMO DATA
--     (made-up bookings by made-up guests) - delete them before going live.
--
-- Hotel ids are assigned 1..20 in the order below. The backend's
-- DataInitializer creates owner1@hotel.com ... owner20@hotel.com by hotel id
-- order, so keep this order if you edit the file.

CREATE DATABASE IF NOT EXISTS hotel_reservation
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE hotel_reservation;

-- Drop in FK-safe order for repeatable runs
DROP TABLE IF EXISTS payouts;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS user_permissions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS room_amenities;
DROP TABLE IF EXISTS room_images;
DROP TABLE IF EXISTS hotel_images;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS guests;
DROP TABLE IF EXISTS hotels;

-- ---------------------------------------------------------
-- Hotel
-- ---------------------------------------------------------
CREATE TABLE hotels (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    address       VARCHAR(255),
    city          VARCHAR(100),
    country       VARCHAR(100),
    phone         VARCHAR(50),
    email         VARCHAR(150),
    star_rating   INT,
    image_url     VARCHAR(500),
    latitude      DOUBLE,
    longitude     DOUBLE,
    -- The platform's cut of every payment for this hotel, as a percentage
    -- (15.00 = 15%). Finance-sensitive - never returned by the public
    -- GET /api/hotels/** endpoints, only via GET/PATCH
    -- /api/hotels/{id}/commission-rate. See entity/Hotel.java + PayoutService.
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    created_at    DATETIME NOT NULL,
    updated_at    DATETIME NOT NULL
);

-- ---------------------------------------------------------
-- Hotel Images (additional gallery photos beyond hotels.image_url -
-- shown as the "Family Room" / "Bathroom" / "Facility" thumbnails on the
-- Hotel Detail page gallery. Add rows here via /admin/hotels.)
-- ---------------------------------------------------------
CREATE TABLE hotel_images (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    hotel_id    BIGINT NOT NULL,
    category    ENUM('ROOM','BATHROOM','FACILITY','OTHER') NOT NULL,
    label       VARCHAR(150),
    image_url   VARCHAR(500) NOT NULL,
    sort_order  INT DEFAULT 0,
    CONSTRAINT fk_hotel_image_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- Room
-- ---------------------------------------------------------
CREATE TABLE rooms (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    hotel_id        BIGINT NOT NULL,
    room_number     VARCHAR(50) NOT NULL,
    room_type       ENUM('SINGLE','DOUBLE','TWIN','DELUXE','FAMILY','SUITE') NOT NULL,
    description     TEXT,
    price_per_night DECIMAL(10,2) NOT NULL,
    capacity        INT NOT NULL,
    bed_type        VARCHAR(100),
    size            DOUBLE,
    floor           INT,
    status          ENUM('AVAILABLE','OCCUPIED','MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
    image_url       VARCHAR(500),
    created_at      DATETIME NOT NULL,
    updated_at      DATETIME NOT NULL,
    CONSTRAINT fk_room_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- Room Images (extra photos per room beyond rooms.image_url -
-- the thumbnail strip on the Room Detail page. Managed via /admin/rooms.)
-- ---------------------------------------------------------
CREATE TABLE room_images (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    room_id     BIGINT NOT NULL,
    label       VARCHAR(150),
    image_url   VARCHAR(500) NOT NULL,
    sort_order  INT DEFAULT 0,
    CONSTRAINT fk_room_image_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- Room Amenities (grouped by category: Bed, Technology,
-- Bathroom, Accessibility, Kitchen - shown in RoomAmenitiesSidebar)
-- ---------------------------------------------------------
CREATE TABLE room_amenities (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    room_id     BIGINT NOT NULL,
    category    ENUM('BED','TECHNOLOGY','BATHROOM','ACCESSIBILITY','KITCHEN') NOT NULL,
    title       VARCHAR(150) NOT NULL,
    description VARCHAR(255),
    icon        VARCHAR(50),
    CONSTRAINT fk_amenity_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- Guest
-- ---------------------------------------------------------
CREATE TABLE guests (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    phone       VARCHAR(50),
    address     VARCHAR(255),
    city        VARCHAR(100),
    country     VARCHAR(100),
    created_at  DATETIME NOT NULL,
    updated_at  DATETIME NOT NULL
);

-- ---------------------------------------------------------
-- Users (login identities - separate from Guest, the booking profile).
-- A GUEST-role user is linked 1:1 to a Guest row. A HOTEL_OWNER or
-- HOTEL_STAFF-role user is linked to exactly one Hotel row via hotel_id
-- (that hotel's own account(s) - can touch that hotel/its rooms/its
-- reservations, nothing else). A HOTEL_STAFF account is additionally
-- limited to whichever specific areas its owner granted - see
-- user_permissions below. An ADMIN has neither a linked Guest nor a linked
-- Hotel.
-- Passwords are BCrypt hashes; this table is intentionally left with no
-- INSERT statements here because hashing needs the app's PasswordEncoder -
-- see backend DataInitializer.java, which seeds admin@hotel.com, the
-- guest1/2/3@test.com accounts, and owner1@hotel.com..owner20@hotel.com
-- (one per hotel below) automatically on first startup. HOTEL_STAFF
-- accounts are created later by each hotel owner via the Staff admin page
-- (POST /api/staff), not seeded here.
-- ---------------------------------------------------------
CREATE TABLE users (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    full_name   VARCHAR(150) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        ENUM('ADMIN','HOTEL_OWNER','HOTEL_STAFF','GUEST') NOT NULL,
    guest_id    BIGINT UNIQUE,
    hotel_id    BIGINT,
    created_at  DATETIME NOT NULL,
    CONSTRAINT fk_user_guest FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL,
    CONSTRAINT fk_user_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE SET NULL
);

-- Fine-grained permissions granted to a HOTEL_STAFF user (ignored for every
-- other role) - see backend entity/Permission.java for what each value
-- unlocks (MANAGE_HOTEL_INFO, MANAGE_ROOMS, MANAGE_RESERVATIONS, VIEW_FINANCE).
-- One row per permission granted; Hibernate manages this table automatically
-- via User.permissions (@ElementCollection), this definition is reference only.
CREATE TABLE user_permissions (
    user_id     BIGINT NOT NULL,
    permission  ENUM('MANAGE_HOTEL_INFO','MANAGE_ROOMS','MANAGE_RESERVATIONS','VIEW_FINANCE') NOT NULL,
    PRIMARY KEY (user_id, permission),
    CONSTRAINT fk_user_permissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- Reservation
-- ---------------------------------------------------------
CREATE TABLE reservations (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    guest_id          BIGINT NOT NULL,
    room_id           BIGINT NOT NULL,
    check_in_date     DATE NOT NULL,
    check_out_date    DATE NOT NULL,
    number_of_guests  INT NOT NULL,
    number_of_rooms   INT NOT NULL DEFAULT 1,
    special_request   TEXT,
    status            ENUM('PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED') NOT NULL DEFAULT 'PENDING',
    total_price       DECIMAL(10,2) NOT NULL,
    cancel_reason     TEXT,
    cancelled_at      DATETIME,
    cancelled_by      VARCHAR(255),
    created_at        DATETIME NOT NULL,
    updated_at        DATETIME NOT NULL,
    CONSTRAINT fk_reservation_guest FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,
    CONSTRAINT fk_reservation_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT chk_dates CHECK (check_out_date > check_in_date)
);

-- ---------------------------------------------------------
-- Payment
-- ---------------------------------------------------------
CREATE TABLE payments (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    reservation_id  BIGINT NOT NULL UNIQUE,
    amount          DECIMAL(10,2) NOT NULL,
    payment_method  ENUM('CREDIT_CARD','DEBIT_CARD','BANK_TRANSFER','CASH') NOT NULL,
    payment_status  ENUM('PENDING','PAID','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
    transaction_id  VARCHAR(100),
    paid_at         DATETIME,
    created_at      DATETIME NOT NULL,
    CONSTRAINT fk_payment_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- Review (a guest's star rating + written feedback for a hotel).
-- One review per reservation - reservation_id is UNIQUE, and the backend
-- only allows creating one once that reservation's status is CHECKED_OUT
-- (see ReviewService.createReview), so every row here represents a
-- verified stay. hotel_id is denormalized onto the row (rather than
-- looked up via reservation -> room -> hotel every time) purely so
-- GET /api/reviews/hotel/{id} and its AVG(rating) summary are a single
-- indexed lookup.
-- ---------------------------------------------------------
CREATE TABLE reviews (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    hotel_id        BIGINT NOT NULL,
    guest_id        BIGINT NOT NULL,
    reservation_id  BIGINT NOT NULL UNIQUE,
    rating          INT NOT NULL,
    comment         TEXT,
    created_at      DATETIME NOT NULL,
    updated_at      DATETIME NOT NULL,
    CONSTRAINT fk_review_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_guest FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5)
);

-- ---------------------------------------------------------
-- Payout (platform -> hotel, net of commission). One per Payment - see
-- entity/Payout.java and service/PayoutService.java for the full flow:
-- the platform collects the guest's full payment, then owes the hotel
-- gross_amount - commission_amount, tracked here as PENDING until an
-- ADMIN records the actual transfer (status -> PAID).
-- commission_rate/commission_amount/net_amount are snapshotted at
-- creation time from hotels.commission_rate, so a later change to a
-- hotel's rate never rewrites a historical payout.
-- ---------------------------------------------------------
CREATE TABLE payouts (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    hotel_id                BIGINT NOT NULL,
    payment_id              BIGINT NOT NULL UNIQUE,
    gross_amount            DECIMAL(10,2) NOT NULL,
    commission_rate         DECIMAL(5,2) NOT NULL,
    commission_amount       DECIMAL(10,2) NOT NULL,
    net_amount              DECIMAL(10,2) NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    payout_method           VARCHAR(20),
    transaction_reference   VARCHAR(100),
    paid_at                 DATETIME,
    created_at              DATETIME NOT NULL,
    updated_at              DATETIME NOT NULL,
    CONSTRAINT fk_payout_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    CONSTRAINT fk_payout_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    CONSTRAINT chk_payout_status CHECK (status IN ('PENDING', 'PAID', 'CANCELLED'))
);

-- =========================================================
-- SEED DATA
-- =========================================================
-- ---- Hotels (20 real hotels: 5 each in Bangkok, Chiang Mai, Phuket, Pattaya) ----
-- image_url follows the project's convention: /images/hotels/<slug of name>.jpg
-- (drop a photo with that file name into frontend/public/images/hotels/, or
-- upload one from /admin/hotels). latitude/longitude = real position of the hotel.
INSERT INTO hotels (name, description, address, city, country, phone, email, star_rating, image_url, latitude, longitude, created_at, updated_at) VALUES
('Mandarin Oriental, Bangkok', 'A historic riverside landmark on the banks of the Chao Phraya in Bang Rak that has welcomed travellers for more than 150 years, with 331 rooms and suites, The Oriental Spa and a complimentary shuttle boat to ICONSIAM.', '48 Oriental Avenue (Soi Charoen Krung 40), Bang Rak', 'Bangkok', 'Thailand', NULL, NULL, 5, '/images/hotels/mandarin-oriental-bangkok.jpg', 13.72391, 100.51423, NOW(), NOW()),
('The Peninsula Bangkok', 'A tall five-star riverfront hotel in Khlong San, on the Thonburi bank of the Chao Phraya River.', '333 Charoennakorn Road, Khlong San', 'Bangkok', 'Thailand', NULL, NULL, 5, '/images/hotels/the-peninsula-bangkok.jpg', 13.72322, 100.51036, NOW(), NOW()),
('Siam Kempinski Hotel Bangkok', 'A resort-style hotel tucked behind Siam Paragon, with tropical gardens, three pools and a short walk to BTS Siam, Siam Square and CentralWorld.', '991/9 Rama I Road, Pathum Wan', 'Bangkok', 'Thailand', NULL, NULL, 5, '/images/hotels/siam-kempinski-hotel-bangkok.jpg', 13.748, 100.536, NOW(), NOW()),
('Grand Hyatt Erawan Bangkok', 'Next to the Erawan Shrine in the heart of Bangkok''s shopping district, linked by skywalk to the Chidlom and Ratchadamri BTS stations, with nine restaurants and bars.', '494 Rajdamri Road, Lumphini, Pathum Wan', 'Bangkok', 'Thailand', '+66-2-254-1234', NULL, 5, '/images/hotels/grand-hyatt-erawan-bangkok.jpg', 13.744, 100.54, NOW(), NOW()),
('The Sukhothai Bangkok', 'A five-star hotel on South Sathorn Road in Bangkok''s Sathon business district.', '13/3 South Sathorn Road, Sathon', 'Bangkok', 'Thailand', NULL, NULL, 5, '/images/hotels/the-sukhothai-bangkok.jpg', 13.72343, 100.54086, NOW(), NOW()),
('Shangri-La Chiang Mai', 'A deluxe city resort set in seven acres of gardens on Chang Klan Road, a short walk from the Night Bazaar and ten minutes from the airport.', '89/8 Chang Klan Road, Mueang', 'Chiang Mai', 'Thailand', '+66-53-253-888', NULL, 5, '/images/hotels/shangri-la-chiang-mai.jpg', 18.77836, 99.00023, NOW(), NOW()),
('Four Seasons Resort Chiang Mai', 'Lanna-style pavilions and villas overlooking rice terraces in the Mae Rim Valley, with a Thai cooking school, an acclaimed spa and an infinity pool.', 'Mae Rim-Samoeng Old Road, Mae Rim', 'Chiang Mai', 'Thailand', NULL, NULL, 5, '/images/hotels/four-seasons-resort-chiang-mai.jpg', 18.91588, 98.93145, NOW(), NOW()),
('Dhara Dhevi Chiang Mai', 'A 60-acre resort inspired by the Lanna kingdom, set among rice paddies on the handicraft stretch of Sankamphaeng Road, about 15 minutes from the airport.', '51/4 Chiang Mai-Sankamphaeng Road, Tha Sala', 'Chiang Mai', 'Thailand', NULL, NULL, 5, '/images/hotels/dhara-dhevi-chiang-mai.jpg', 18.77796, 99.03674, NOW(), NOW()),
('137 Pillars House', 'A boutique hotel in a restored 1880s teak house, once the East Borneo Company headquarters, with 30 suites and a 25-metre pool in the Wat Ket district.', '2 Soi 1 Nawatgate Road, Wat Ket', 'Chiang Mai', 'Thailand', '+66-53-247-788', NULL, 5, '/images/hotels/137-pillars-house.jpg', 18.792, 99.0041, NOW(), NOW()),
('Rachamankha', 'A quiet Lanna-style boutique hotel with 25 rooms inside the old city walls, a minute''s walk from Wat Phra Singh.', '6 Soi Ratchamanka 9, Si Phum', 'Chiang Mai', 'Thailand', NULL, NULL, 4, '/images/hotels/rachamankha.jpg', 18.78673, 98.97997, NOW(), NOW()),
('Banyan Tree Phuket', 'An all-pool-villa resort beside a saltwater lagoon near Bang Tao Beach, with a world-renowned spa and an 18-hole golf course nearby.', '33, 33/27 Moo 4, Srisoonthorn Road, Cherngtalay, Thalang', 'Phuket', 'Thailand', NULL, NULL, 5, '/images/hotels/banyan-tree-phuket.jpg', 8.01242, 98.29566, NOW(), NOW()),
('Amanpuri', 'The original Aman resort, set in a coconut grove on a peninsula at Pansea Beach on Phuket''s west coast, about 30 minutes from the airport.', 'Pansea Beach, Cherngtalay, Thalang', 'Phuket', 'Thailand', '+66-76-324-333', NULL, 5, '/images/hotels/amanpuri.jpg', 7.9829, 98.2765, NOW(), NOW()),
('Katathani Phuket Beach Resort', 'A large, family-friendly beachfront resort on Kata Noi Bay with around 850 metres of beach, six pools and a wide range of restaurants and bars.', '14 Kata Noi Road, Karon', 'Phuket', 'Thailand', NULL, NULL, 5, '/images/hotels/katathani-phuket-beach-resort.jpg', 7.807, 98.3, NOW(), NOW()),
('The Memory at On On Hotel', 'Phuket''s oldest hotel (built in 1927), restored as a heritage boutique stay in the heart of Phuket Old Town.', '19 Phang-Nga Road, Talat Yai, Mueang Phuket', 'Phuket', 'Thailand', '+66-76-363-700', NULL, 3, '/images/hotels/the-memory-at-on-on-hotel.jpg', 7.88379, 98.38842, NOW(), NOW()),
('Holiday Inn Resort Phuket', 'A beachfront resort in the middle of Patong with six pools, a water slide and easy walking to Jungceylon and Bangla Road.', '52 Thaweewong Road, Patong, Kathu', 'Phuket', 'Thailand', '+66-76-370-200', NULL, 4, '/images/hotels/holiday-inn-resort-phuket.jpg', 7.88873, 98.29244, NOW(), NOW()),
('Hilton Pattaya', 'A 34-storey tower above Central Festival Pattaya Beach, with an infinity pool, ocean-view rooms with balconies and direct access to 300 shops and restaurants.', '333/101 Moo 9, Beach Road, Nong Prue, Bang Lamung', 'Pattaya', 'Thailand', NULL, NULL, 5, '/images/hotels/hilton-pattaya.jpg', 12.93514, 100.88305, NOW(), NOW()),
('Centara Grand Mirage Beach Resort Pattaya', 'A themed beach resort on Wong Amat Beach in North Pattaya, with 555 rooms, a lazy river and a free water park.', '277 Moo 5, Naklua, Bang Lamung', 'Pattaya', 'Thailand', '+66-38-301-234', NULL, 5, '/images/hotels/centara-grand-mirage-beach-resort-pattaya.jpg', 12.95825, 100.8859, NOW(), NOW()),
('Royal Cliff Beach Hotel', 'A family-oriented beachfront resort on the Phra Tamnak headland at the south end of Pattaya Bay, with a private beach, six pools and eleven restaurants.', '353 Phra Tamnuk Road, Phra Tamnak Hill', 'Pattaya', 'Thailand', NULL, NULL, 5, '/images/hotels/royal-cliff-beach-hotel.jpg', 12.92259, 100.8605, NOW(), NOW()),
('Amari Pattaya', 'A beachfront resort at the north tip of Pattaya Bay, a short walk from Terminal 21, with free-form pools, an aqua park and a kids'' club.', '240 Moo 5, Pattaya Beach Road, Naklua, Bang Lamung', 'Pattaya', 'Thailand', NULL, NULL, 5, '/images/hotels/amari-pattaya.jpg', 12.9489, 100.88556, NOW(), NOW()),
('Ambassador City Jomtien', 'A large hotel complex at Na Jomtien with a private beach, an outdoor pool and a sauna, on Sukhumvit Road south of central Pattaya.', '21/10 Moo 2, Sukhumvit Road, Na Jomtien, Sattahip', 'Pattaya', 'Thailand', NULL, NULL, 3, '/images/hotels/ambassador-city-jomtien.jpg', 12.8388, 100.9088, NOW(), NOW());
-- ---- Rooms (6 per hotel = 120 total; every hotel offers all 6 room types) ----
-- Prices (USD per night) = the hotel's SINGLE-room price x a fixed multiplier
-- per room type, rounded to the nearest 5. Edit the first list below to
-- re-price a whole hotel in one place.
-- (COLLATE on the joins keeps the comparison working whatever collation the
-- database was created with.)
INSERT INTO rooms (hotel_id, room_number, room_type, description, price_per_night, capacity, bed_type, size, floor, status, image_url, created_at, updated_at)
SELECT h.id,
       rt.room_number,
       rt.room_type,
       rt.description,
       ROUND(p.base_price * rt.multiplier / 5) * 5,
       rt.capacity,
       rt.bed_type,
       rt.`size`,
       rt.`floor`,
       'AVAILABLE',
       rt.image_url,
       NOW(),
       NOW()
FROM hotels h
JOIN (
    SELECT 'Mandarin Oriental, Bangkok' AS hotel_name, 220 AS base_price
    UNION ALL SELECT 'The Peninsula Bangkok', 200
    UNION ALL SELECT 'Siam Kempinski Hotel Bangkok', 150
    UNION ALL SELECT 'Grand Hyatt Erawan Bangkok', 130
    UNION ALL SELECT 'The Sukhothai Bangkok', 140
    UNION ALL SELECT 'Shangri-La Chiang Mai', 85
    UNION ALL SELECT 'Four Seasons Resort Chiang Mai', 260
    UNION ALL SELECT 'Dhara Dhevi Chiang Mai', 190
    UNION ALL SELECT '137 Pillars House', 160
    UNION ALL SELECT 'Rachamankha', 110
    UNION ALL SELECT 'Banyan Tree Phuket', 280
    UNION ALL SELECT 'Amanpuri', 520
    UNION ALL SELECT 'Katathani Phuket Beach Resort', 90
    UNION ALL SELECT 'The Memory at On On Hotel', 35
    UNION ALL SELECT 'Holiday Inn Resort Phuket', 70
    UNION ALL SELECT 'Hilton Pattaya', 95
    UNION ALL SELECT 'Centara Grand Mirage Beach Resort Pattaya', 100
    UNION ALL SELECT 'Royal Cliff Beach Hotel', 90
    UNION ALL SELECT 'Amari Pattaya', 70
    UNION ALL SELECT 'Ambassador City Jomtien', 30
) p ON p.hotel_name COLLATE utf8mb4_unicode_ci = h.name
CROSS JOIN (
    SELECT '101' AS room_number, 'SINGLE' AS room_type, 'Single room with a comfortable single bed and modern amenities.' AS description, 1.00 AS multiplier, 1 AS capacity, 'Single Bed' AS bed_type, 20 AS `size`, 1 AS `floor`, '/images/rooms/single-room.jpg' AS image_url
    UNION ALL SELECT '102', 'DOUBLE', 'Double room with a comfortable queen bed and modern amenities.', 1.55, 2, 'Queen Bed', 28, 1, '/images/rooms/double-room.jpg'
    UNION ALL SELECT '203', 'TWIN',   'Twin room with comfortable twin beds and modern amenities.', 1.45, 2, 'Twin Beds', 27, 2, '/images/rooms/twin-room.jpg'
    UNION ALL SELECT '304', 'DELUXE', 'Deluxe room with a comfortable king bed and modern amenities.', 2.40, 2, 'King Bed', 35, 3, '/images/rooms/deluxe-room.jpg'
    UNION ALL SELECT '405', 'FAMILY', 'Family room with two comfortable queen beds and modern amenities.', 3.00, 4, 'Two Queen Beds', 45, 4, '/images/rooms/family-room.jpg'
    UNION ALL SELECT '506', 'SUITE',  'Suite with a comfortable king bed, a separate living area and modern amenities.', 4.40, 3, 'King Bed', 55, 5, '/images/rooms/suite.jpg'
) rt
ORDER BY h.id, rt.`floor`;

-- One room in maintenance, so the admin dashboard shows a non-AVAILABLE status.
UPDATE rooms SET status = 'MAINTENANCE'
WHERE room_type = 'FAMILY'
  AND hotel_id = (SELECT id FROM hotels WHERE name = 'Grand Hyatt Erawan Bangkok');

-- ---- Room Amenities (every SUITE gets the showcase amenity list) ----
INSERT INTO room_amenities (room_id, category, title, description, icon)
SELECT r.id, a.category, a.title, a.description, a.icon
FROM rooms r
CROSS JOIN (
    SELECT 'BED' AS category, 'Bed Room' AS title, '1 bed room & meeting area' AS description, 'bed' AS icon
    UNION ALL SELECT 'BED',           'Bed Type & Others', 'Double bed, sofa, table & more',  'sofa'
    UNION ALL SELECT 'TECHNOLOGY',    'Technology',        'TV, fridge, AC, coffee maker',    'tv'
    UNION ALL SELECT 'BATHROOM',      'Bathroom',          '1 large attached bathroom',       'bath'
    UNION ALL SELECT 'ACCESSIBILITY', 'Accessibility',     'Private balcony, free Wifi',      'accessibility'
    UNION ALL SELECT 'KITCHEN',       'Kitchen',           '1 mini kitchen',                  'utensils'
) a
WHERE r.room_type = 'SUITE'
ORDER BY r.id;

-- ---- Guests (including the guest1/2/3@test.com demo accounts) ----
INSERT INTO guests (first_name, last_name, email, phone, address, city, country, created_at, updated_at) VALUES
('Somchai', 'Jaidee',  'somchai.jaidee@example.com', '+66-81-111-2222', '12 Sukhumvit Rd', 'Bangkok',    'Thailand', NOW(), NOW()),
('Aom',     'Sirikul', 'aom.sirikul@example.com',    '+66-89-333-4444', '45 Nimman Rd',    'Chiang Mai', 'Thailand', NOW(), NOW()),
('John',    'Smith',   'john.smith@example.com',     '+1-555-123-4567', '10 Park Ave',     'New York',   'USA',      NOW(), NOW()),
('Guest',   'One',     'guest1@test.com',            '+66-80-000-0001', '1 Test Street',   'Bangkok',    'Thailand', NOW(), NOW()),
('Guest',   'Two',     'guest2@test.com',            '+66-80-000-0002', '2 Test Street',   'Bangkok',    'Thailand', NOW(), NOW()),
('Guest',   'Three',   'guest3@test.com',            '+66-80-000-0003', '3 Test Street',   'Bangkok',    'Thailand', NOW(), NOW());

-- ---- Sample reservations / payments / reviews / payouts (DEMO DATA) ----
-- These are made-up bookings by made-up guests, only so the admin dashboards,
-- "Reservation History" and review screens have something to show. Delete the
-- sections below (or run DELETE FROM reservations;) before going live with
-- real hotels. Totals are computed from the room price.
--
--  #1 Somchai  - Mandarin Oriental TWIN           - CHECKED_OUT, paid
--  #2 guest1   - Shangri-La Chiang Mai SUITE      - CONFIRMED,   paid (upcoming) - the "successful flow" demo
--  #3 guest3   - Holiday Inn Resort Phuket DELUXE - PENDING (demo cancel / invalid edit -> 400)
--  #4 Aom      - The Memory at On On FAMILY       - PENDING
--  #5 guest1   - The Peninsula Bangkok SINGLE     - CHECKED_OUT, paid (has a review - demo "Edit review")
INSERT INTO reservations (guest_id, room_id, check_in_date, check_out_date, number_of_guests, number_of_rooms, special_request, status, total_price, created_at, updated_at)
SELECT g.id, r.id, d.check_in, d.check_out, d.num_guests, 1, d.special_request, d.status,
       r.price_per_night * DATEDIFF(d.check_out, d.check_in),
       NOW(), NOW()
FROM (
    SELECT 1 AS ord, 'somchai.jaidee@example.com' AS email, 'Mandarin Oriental, Bangkok' AS hotel_name, 'TWIN' AS room_type, DATE '2026-07-01' AS check_in, DATE '2026-07-04' AS check_out, 2 AS num_guests, CAST(NULL AS CHAR) AS special_request, 'CHECKED_OUT' AS status
    UNION ALL SELECT 2, 'guest1@test.com',         'Shangri-La Chiang Mai',     'SUITE',  DATE '2026-10-10', DATE '2026-10-13', 2, 'Anniversary trip, late check-in', 'CONFIRMED'
    UNION ALL SELECT 3, 'guest3@test.com',         'Holiday Inn Resort Phuket', 'DELUXE', DATE '2026-11-05', DATE '2026-11-07', 2, CAST(NULL AS CHAR),                'PENDING'
    UNION ALL SELECT 4, 'aom.sirikul@example.com', 'The Memory at On On Hotel', 'FAMILY', DATE '2026-12-01', DATE '2026-12-05', 3, CAST(NULL AS CHAR),                'PENDING'
    UNION ALL SELECT 5, 'guest1@test.com',         'The Peninsula Bangkok',     'SINGLE', DATE '2026-06-15', DATE '2026-06-17', 1, CAST(NULL AS CHAR),                'CHECKED_OUT'
) d
JOIN guests g ON g.email = d.email COLLATE utf8mb4_unicode_ci
JOIN hotels h ON h.name  = d.hotel_name COLLATE utf8mb4_unicode_ci
JOIN rooms  r ON r.hotel_id = h.id AND r.room_type = d.room_type COLLATE utf8mb4_unicode_ci
ORDER BY d.ord;

-- ---- Payments for reservations #1, #2 and #5 ----
-- #3 and #4 stay unpaid on purpose so PENDING -> CONFIRMED can be demoed
-- through POST /api/payments.
INSERT INTO payments (reservation_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at)
SELECT r.id, r.total_price, p.method, 'PAID', p.txn, NOW(), NOW()
FROM (
    SELECT 1 AS reservation_id, 'BANK_TRANSFER' AS method, 'TXN-DEMO0001' AS txn
    UNION ALL SELECT 2, 'CREDIT_CARD', 'TXN-DEMO0002'
    UNION ALL SELECT 5, 'CREDIT_CARD', 'TXN-DEMO0005'
) p
JOIN reservations r ON r.id = p.reservation_id
ORDER BY r.id;

-- ---- Reviews: one per completed (CHECKED_OUT) stay (#1 and #5) ----
-- guest1@test.com's Res #5 IS loggable, so its review is the one to use for
-- demoing "Edit review"/"Delete" end to end; Res #2 (still CONFIRMED) is what
-- "Write a review" looks like *before* it's eligible.
INSERT INTO reviews (hotel_id, guest_id, reservation_id, rating, `comment`, created_at, updated_at)
SELECT rm.hotel_id, r.guest_id, r.id, v.rating, v.`comment`, NOW(), NOW()
FROM (
    SELECT 1 AS reservation_id, 5 AS rating, 'Sample review: beautiful riverside setting, very attentive staff and a spotless room. The shuttle boat made getting around easy.' AS `comment`
    UNION ALL SELECT 5, 4, 'Sample review: great river views and a quiet, comfortable room. Check-in was quick and the staff were friendly.'
) v
JOIN reservations r ON r.id = v.reservation_id
JOIN rooms rm ON rm.id = r.room_id
ORDER BY r.id;

-- ---- Payouts at the default 15% commission ----
-- Payment 1 (Mandarin Oriental) and payment 3 (The Peninsula) are left
-- PENDING so an ADMIN can demo "mark as paid" (POST /api/payouts/{id}/pay);
-- payment 2 (Shangri-La) is already PAID to show settled history.
INSERT INTO payouts (hotel_id, payment_id, gross_amount, commission_rate, commission_amount, net_amount, status, payout_method, transaction_reference, paid_at, created_at, updated_at)
SELECT rm.hotel_id, p.id, p.amount, 15.00,
       ROUND(p.amount * 0.15, 2),
       p.amount - ROUND(p.amount * 0.15, 2),
       CASE WHEN p.id = 2 THEN 'PAID' ELSE 'PENDING' END,
       CASE WHEN p.id = 2 THEN 'BANK_TRANSFER' END,
       CASE WHEN p.id = 2 THEN 'PAYOUT-DEMO0002' END,
       CASE WHEN p.id = 2 THEN NOW() END,
       NOW(), NOW()
FROM payments p
JOIN reservations r ON r.id = p.reservation_id
JOIN rooms rm ON rm.id = r.room_id
ORDER BY p.id;

-- ---- Quick checks after running (optional) ----
--   SELECT COUNT(*) FROM hotels;                          -- 20
--   SELECT COUNT(*) FROM rooms;                           -- 120
--   SELECT city, COUNT(*) FROM hotels GROUP BY city;      -- 5 each
--   SELECT name, latitude, longitude FROM hotels ORDER BY id;
--   SELECT COUNT(*) FROM reservations;                    -- 5

-- =========================================================
-- TEST ACCOUNTS (see README section "Test Accounts" for full walkthroughs)
-- =========================================================
-- Real login credentials exist via Spring Security + JWT. The Guest rows
-- above are linked to actual login-capable `users` rows automatically
-- created on backend startup (see backend DataInitializer.java) - this SQL
-- file only seeds the business data (Guest/Reservation/Payment); passwords
-- are hashed by the app itself, not stored here.
--
--   Account emails, passwords and what each one demonstrates are documented
--   in README.md ("Test Accounts") only. Seeded accounts: one ADMIN, three
--   GUESTs (guest_id 4, 5 and 6 - linked to the Guest rows above) and one
--   HOTEL_OWNER per hotel. Disable the demo ones with APP_SEED_DEMO_ACCOUNTS=false.
