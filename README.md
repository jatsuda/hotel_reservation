# Hotel Reservation System

A full-stack hotel reservation system with a real, working connection between
frontend, backend, and database — no mock data. Built to a "modern luxury
hotel" earth-tone design.

```
Next.js (frontend)  --REST-->  Spring Boot (backend)  --JPA/Hibernate-->  MySQL
```

---

## 1. Project Overview

Guests can browse hotels, view rooms, and book a stay from search to payment
and confirmation. Admins can manage hotels, rooms, and reservations from a
dashboard. Every create/update goes to MySQL through the Spring Boot API —
refreshing the page never loses data.

## 2. Tech Stack

| Layer     | Technology                                                   |
|-----------|---------------------------------------------------------------|
| Backend   | Java 17, Spring Boot 3, Spring Web (REST), Spring Data JPA, Hibernate, Spring Security + JWT, Maven |
| Database  | MySQL 8                                                        |
| Frontend  | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS   |

## 3. System Architecture

```
Next.js (:3000)
     |  fetch() via lib/api.ts
     v
Spring Boot REST Controllers (:8080/api/**)
     |
Service layer (business rules: overlap check, capacity, pricing)
     |
Spring Data JPA Repositories
     |
Hibernate
     |
MySQL (hotel_reservation)
```

Layered backend: **Controller → Service → Repository → MySQL**.
Frontend never talks to the database directly — everything goes through the
REST API, and all `fetch` calls live in `frontend/lib/api.ts`.

## 4. Database ER Diagram

```
User (1) ─(1:1)─ Guest (1) ───< Reservation >─── (1) Room ───> (1) Hotel
                                     |    |                        │
                                   (1:1) (1:1)                     │
                                     v    v                        │
                                  Payment Review ───────────────> (Hotel)
                                     |                              │
                                   (1:1)                            │
                                     v                              │
                                  Payout ─────────────────────> (Hotel)
                                                                    │
                                                                    └───< RoomAmenity
```

- **User → Guest**: one-to-one (only for GUEST-role users; ADMIN users have no linked Guest)
- **Hotel → Room**: one-to-many
- **Room → RoomAmenity**: one-to-many (grouped by category: Bed, Technology, Bathroom, Accessibility, Kitchen)
- **Guest → Reservation**: one-to-many
- **Room → Reservation**: one-to-many
- **Reservation → Payment**: one-to-one
- **Reservation → Review**: one-to-one (a stay can only be reviewed once, and only after it's `CHECKED_OUT`)
- **Hotel → Review**: one-to-many (denormalized onto the row for a fast `AVG(rating)` lookup - see Section 10)
- **Payment → Payout**: one-to-one (the platform is a payment intermediary - see Section 10's Payouts section)
- **Hotel → Payout**: one-to-many

See `database/schema.sql` for full column definitions and seed data.

## 5. Authentication & Authorization

Login is real: Spring Security validates credentials against the `users`
table (BCrypt-hashed passwords) and issues a JWT, which the frontend stores
and sends as `Authorization: Bearer {token}` on every subsequent request.

**Browsing never requires login; booking always does.** Anyone can view the
homepage, hotel lists, hotel details, and room details without an account —
those pages call only public endpoints. The moment someone tries to actually
reserve a room, `components/RoomBookingCta.tsx` checks the client's auth
state: logged-in users go straight to `/booking`, everyone else is sent to
`/login?redirect=/booking?roomId={id}` and bounced back to the booking page
right after logging in. The `/booking`, `/payment`, and `/reservations`
pages each also redirect to `/login` on their own if visited directly while
logged out, so there's no way to reach the booking/payment flow unauthenticated
even by typing the URL directly.

**Why `User` is separate from `Guest`**: `Guest` already existed as the
booking/profile record referenced by `Reservation`. Rather than reshape that
relationship, `User` (the login identity) holds a one-to-one link to `Guest`
for GUEST-role accounts. Signing up via `/api/auth/register` creates both
rows together. An ADMIN account has no linked `Guest`.

### Route authorization matrix

| Access level | Routes |
|---|---|
| **Public** | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/hotels/**`, `GET /api/rooms/**`, `GET /api/reservations/room/{id}/upcoming` (booked dates + first name & last initial only), `GET /api/reviews/hotel/**` |
| **Authenticated** (any role) | `GET /api/auth/me`, `POST /api/reservations` (a GUEST can only book for their own guest profile; only ADMIN can book for someone else), `GET/POST /api/reservations/{id}`, `POST /api/reservations/{id}/cancel`, `POST /api/payments`, `GET /api/reservations/me`, `GET /api/reviews/me`, `GET /api/reviews/reviewable`, `POST /api/reviews`, `PUT/DELETE /api/reviews/{id}` (own review; a hotel's ADMIN/HOTEL_OWNER/permitted HOTEL_STAFF may also delete/moderate one) |
| **ADMIN, HOTEL_OWNER, or HOTEL_STAFF** | `POST/PUT/PATCH/DELETE /api/rooms/**`, `PUT /api/hotels/**`, `GET /api/reservations` (full list), `PUT /api/reservations/**`, check-in/check-out, `GET /api/payouts/hotel/**`, `GET /api/hotels/{id}/commission-rate` - each narrowed in the service layer to "their own hotel only" (and, for HOTEL_STAFF, the specific `Permission` they were granted - see `CurrentUserProvider`) |
| **ADMIN or HOTEL_OWNER** | `/api/staff/**` (managing that hotel's HOTEL_STAFF accounts) |
| **ADMIN only** | `POST/DELETE /api/hotels/**`, `GET /api/guests/**`, `DELETE /api/reservations/**`, `GET/PUT /api/payments/**`, `GET /api/payouts`, `GET /api/payouts/summary`, `POST /api/payouts/{id}/pay`, `PATCH /api/hotels/{id}/commission-rate` |

Ownership is double-enforced: Spring Security's route matchers gate broad
categories (e.g. "must be logged in"), and the service layer
(`ReservationService`/`PaymentService`) checks that a GUEST can only read,
cancel, or pay for **their own** reservations — an ADMIN can act on any.

### Frontend session handling

- The JWT lives in `localStorage` and is attached automatically by
  `frontend/lib/api.ts` on every request.
- The user's role is mirrored into a plain cookie (`hotel_auth_role`) purely
  so `middleware.ts` can redirect non-admins away from `/admin/**` before the
  page renders. **This cookie is not the real security boundary** — a user
  could edit it in devtools, but every `/admin` API call is still checked
  server-side by Spring Security regardless of what the cookie says.
- `app/admin/layout.tsx` adds a client-side check as a second line of
  defense (covers the moment right after login before the cookie is set).

### Security hardening

| Area | What the backend does |
|---|---|
| **Login brute force** | `POST /api/auth/login` allows 5 failed attempts per client IP + email and 30 per IP in 15 minutes, then answers `429 Too Many Requests` (`LoginRateLimiter`, in-memory - use a shared store/gateway if you run several instances; behind a reverse proxy set `server.forward-headers-strategy` so the real client IP is seen) |
| **Passwords** | 8-72 characters with at least one letter and one number (register, change password, staff creation); stored as BCrypt hashes |
| **JWT secret** | Read from `JWT_SECRET`. No default is shipped; if it is empty a random key is generated at startup, and a key under 32 bytes (or the old public placeholder) stops the app from starting |
| **Reservation privacy** | `GET /api/reservations?guestId=` is scoped: ADMIN sees all, a hotel owner/staff only that guest's bookings **at their own hotel**, a guest only their own. The public `/room/{id}/upcoming` endpoint returns dates and "First L." only - no email, phone, address or payment data |
| **Booking / payment rules** | Only a GUEST (for themselves) or ADMIN can create a reservation; only a `PENDING` reservation can be paid; the raw `status` on `PUT /api/reservations/{id}` accepts only `PENDING`/`CONFIRMED` and closed (cancelled / checked-in / checked-out) reservations can't be edited; dates can't change after payment; a guest can't self-cancel (and self-refund) a stay that is already checked in; row locks stop two requests double-booking a room or double-paying a reservation |
| **Errors** | Unexpected errors return a generic 500 body (details go to the server log only); malformed JSON returns a fixed 400 message |
| **HTTP** | CORS limited to `Authorization`, `Content-Type`, `Accept`; `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer` and an API-only CSP on every response; every route outside `/api` is denied by default |
| **Logging** | SQL logging is off by default (`SPRING_JPA_SHOW_SQL=true` to enable); seeded passwords are never logged |

Known limits you should still address before a real launch: the JWT is kept in
`localStorage` (an XSS bug would expose it - an httpOnly cookie session is the
hardened alternative); tokens stay valid until expiry even after a password
change; and `PaymentService` is a **simulated** gateway that marks any well-formed
payment as paid - connect a real provider (Stripe, Omise, ...) and verify
its webhook before taking real money.

## 6. Database Setup

```sql
CREATE DATABASE hotel_reservation;
```

Then either:
- Let Hibernate create the tables automatically (see `ddl-auto=update` below), **or**
- Run the full script for schema + seed data:

```bash
mysql -u root -p < database/schema.sql
```

## 7. Backend Setup

```bash
cd backend
```

Edit `src/main/resources/application.properties` and set your local MySQL
credentials:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/hotel_reservation?useSSL=false&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=YOUR_PASSWORD

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false

server.port=8080
```

> Never commit a real production password. Use environment variables or a
> secrets manager in production.

Run it:

```bash
mvn spring-boot:run
```

The API is now live at `http://localhost:8080/api`.

## 8. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env.local` (a `.env.local.example` is provided):

```
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_LONGDO_MAP_KEY=your-key-here
```

The Longdo Map key powers the small map + directions widget on each Hotel
Detail page (`components/HotelMap.tsx`, loaded as a plain `<script>` from
`https://api.longdo.com/map/?key=...` - Longdo Map isn't published as an npm
package for React). Get a free key at https://map.longdo.com/console. If you
skip this, the site still runs fine; the map area just shows a "Map
unavailable" placeholder instead. The **Get directions** button underneath
the map (Section 10 has no endpoint for this - it's entirely client-side)
works regardless of whether this key is set, since it just opens a Google
Maps directions link using the hotel's `latitude`/`longitude` as the
destination and, optionally, the guest's typed address or browser geolocation
("Use my location") as the origin; when geolocation is used, the route is
also drawn on the embedded Longdo map itself via its built-in `Route` module.

Run it:

```bash
npm run dev
```

The site is now live at `http://localhost:3000`.

## 9. Environment Variables

| File                                   | Variable                    | Purpose                    |
|-----------------------------------------|------------------------------|-----------------------------|
| `backend/.../application.properties`    | `spring.datasource.url`      | MySQL JDBC URL              |
| `backend/.../application.properties`    | `spring.datasource.username` | MySQL user                  |
| `backend/.../application.properties`    | `spring.datasource.password` | MySQL password (do not commit real value) |
| env var / `application.properties`      | `JWT_SECRET` (`jwt.secret`)   | HS256 signing key for JWTs, at least 32 random bytes (`openssl rand -base64 48`). **Required for any real deployment**; if empty a random key is generated per start |
| env var / `application.properties`      | `APP_SEED_DEMO_ACCOUNTS`      | `true` (default) seeds the demo guest/owner accounts listed under Test Accounts; set `false` in production |
| env var / `application.properties`      | `APP_SEED_ADMIN_PASSWORD`     | Password for the seeded admin account (falls back to the demo password in Test Accounts when empty - always set it in production) |
| env var / `application.properties`      | `APP_SEED_GUEST_PASSWORD`, `APP_SEED_OWNER_PASSWORD` | Optional overrides for the demo guest / hotel-owner passwords |
| env var / `application.properties`      | `SPRING_JPA_SHOW_SQL`         | `true` to print SQL while debugging (default `false`) |
| `backend/.../application.properties`    | `jwt.expiration-ms`           | Token lifetime in milliseconds (default 24h) |
| `backend/.../application.properties`    | `app.cors.allowed-origins`    | Comma-separated frontend origins allowed to call the API (see Section 12 for cloud deployment) |
| `frontend/.env.local`                   | `NEXT_PUBLIC_API_URL`        | Base URL the frontend calls |
| `frontend/.env.local`                   | `NEXT_PUBLIC_LONGDO_MAP_KEY` | Longdo Map API key, for the Hotel Detail page map + directions widget (see Section 8) |

## 10. API Documentation

Base URL: `http://localhost:8080/api`

Unless noted otherwise, protected endpoints expect `Authorization: Bearer {token}`.
See [Section 5](#5-authentication--authorization) for the full access matrix.

### Auth
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Create a GUEST account + linked Guest profile, returns a JWT |
| POST | `/auth/login` | Public | Returns a JWT for a valid email/password |
| GET | `/auth/me` | Authenticated | Current user's profile (from the token) |

### Hotels
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/hotels` | Public | List all hotels |
| GET | `/hotels/{id}` | Public | Get one hotel |
| POST | `/hotels` | ADMIN | Create a hotel |
| PUT | `/hotels/{id}` | ADMIN | Update a hotel |
| DELETE | `/hotels/{id}` | ADMIN | Delete a hotel |

### Rooms
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/rooms` | Public | List all rooms (`?hotelId=` to filter) |
| GET | `/rooms/available` | Public | List rooms with status `AVAILABLE` |
| GET | `/rooms/{id}` | Public | Get one room (includes `amenities[]`) |
| POST | `/rooms` | ADMIN | Create a room (optionally with `amenities[]`) |
| PUT | `/rooms/{id}` | ADMIN | Update a room (sending `amenities[]` replaces the full list) |
| PATCH | `/rooms/{id}/status?status=` | ADMIN | Change room status |
| DELETE | `/rooms/{id}` | ADMIN | Delete a room |

### Guests
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/guests` | ADMIN | List all guests |
| GET | `/guests/{id}` | ADMIN | Get one guest |
| POST | `/guests` | ADMIN | Create a guest (front-desk / walk-in) |
| PUT | `/guests/{id}` | ADMIN | Update a guest |
| DELETE | `/guests/{id}` | ADMIN | Delete a guest |

Regular users create their Guest profile automatically via `POST /auth/register` instead.

### Reservations
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/reservations` | ADMIN | List all reservations (`?guestId=` to filter) |
| GET | `/reservations/me` | Authenticated | Reservations for the logged-in user's own Guest profile |
| GET | `/reservations/{id}` | Authenticated (owner or ADMIN) | Get one reservation |
| GET | `/reservations/room/{roomId}/upcoming` | Public | Upcoming (today or later, non-cancelled) reservations for a room - powers the Advance Booking widget and Availability Calendar |
| POST | `/reservations` | Authenticated | Create a reservation (GUEST can only book for themselves; runs all validation rules) |
| PUT | `/reservations/{id}` | ADMIN | Update a reservation |
| POST | `/reservations/{id}/cancel` | Authenticated (owner or ADMIN) | Cancel and free the room |
| POST | `/reservations/{id}/check-in` | ADMIN | Mark as checked in |
| POST | `/reservations/{id}/check-out` | ADMIN | Mark as checked out and free the room |
| DELETE | `/reservations/{id}` | ADMIN | Delete a reservation |

### Payments
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/payments` | ADMIN | List all payments |
| GET | `/payments/{id}` | Authenticated (owner or ADMIN) | Get one payment |
| POST | `/payments` | Authenticated (owner or ADMIN) | Pay a reservation (moves it to `CONFIRMED`) |
| PUT | `/payments/{id}` | ADMIN | Update a payment (e.g. refund) |

### Payouts (platform → hotel, net of commission)
The platform acts as a payment intermediary: it collects the guest's full
payment, then owes the hotel that amount minus its commission. A `Payout` is
created automatically the moment a `Payment` succeeds (see
`PaymentService.createPayment` → `PayoutService.createForPayment`), sitting
`PENDING` until an ADMIN records the actual transfer (`PAID`). If the
underlying payment is later refunded, a still-`PENDING` payout is
auto-`CANCELLED` (a `PAID` one has already left the platform, so reversing
it is a manual, out-of-band process). Every payout snapshots the hotel's
commission rate **at the moment of payment**, so a later rate change never
rewrites a historical payout.

A hotel's commission rate defaults to 15% and is finance-sensitive - it's
never included in the public `GET /api/hotels/**` response, only via the
dedicated endpoints below, and only an ADMIN can change it.

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/payouts` | ADMIN | Every payout, platform-wide, newest first - optionally narrowed with `?status=PENDING\|PAID\|CANCELLED` |
| GET | `/payouts/summary` | ADMIN | Platform-wide totals: `{ totalGross, totalCommission, totalNetPending, totalNetPaid, pendingCount, paidCount }` |
| GET | `/payouts/hotel/{hotelId}` | ADMIN, or that hotel's HOTEL_OWNER/HOTEL_STAFF with `VIEW_FINANCE` | One hotel's payout history |
| GET | `/payouts/hotel/{hotelId}/summary` | Same as above | Same totals shape, scoped to one hotel |
| POST | `/payouts/{id}/pay` | ADMIN | Records that the platform transferred a pending payout's net amount - body: `{ payoutMethod: "BANK_TRANSFER"\|"PROMPTPAY"\|"CHEQUE"\|"OTHER", transactionReference }` |
| GET | `/hotels/{id}/commission-rate` | ADMIN, or that hotel's HOTEL_OWNER/HOTEL_STAFF with `VIEW_FINANCE` | `{ commissionRate }` for that hotel |
| PATCH | `/hotels/{id}/commission-rate` | ADMIN | Change a hotel's commission rate - a hotel can never set its own cut |

### Reviews
A guest can leave one star rating (1-5) + written comment per stay, but only
once that reservation's status is `CHECKED_OUT` - this is what makes every
review a **verified stay**. `POST`/`PUT` accept `{ rating, comment }` (plus
`reservationId` on create); every response uses a privacy-safe projection
(`guestName` is a display name like `"Somchai J."`, never the reviewer's
email/phone/address) since the hotel-listing endpoints are public.

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/reviews/hotel/{hotelId}` | Public | All reviews for a hotel, newest first |
| GET | `/reviews/hotel/{hotelId}/summary` | Public | `{ averageRating, totalReviews }` for a hotel |
| GET | `/reviews/me` | Authenticated | The logged-in guest's own reviews |
| GET | `/reviews/reviewable` | Authenticated | The logged-in guest's `CHECKED_OUT` stays that don't have a review yet - powers the "Write a review" prompt |
| POST | `/reviews` | Authenticated (GUEST) | Create a review for one of your own checked-out stays (400 if it's not checked out yet or already reviewed) |
| PUT | `/reviews/{id}` | Authenticated (owner) | Edit your own review's rating/comment |
| DELETE | `/reviews/{id}` | Authenticated (owner, or that hotel's ADMIN/HOTEL_OWNER/HOTEL_STAFF with `MANAGE_HOTEL_INFO`) | Delete a review - by the reviewer themselves, or as moderation |

## 11. How to Run (end to end)

1. Start MySQL and create the database (Section 6).
2. `cd backend && mvn spring-boot:run` — wait for `Started HotelReservationApplication`.
   On first startup, `DataInitializer` automatically creates the admin and
   test guest logins (see Test Accounts below) — no manual SQL needed for auth.
3. `cd frontend && npm install && npm run dev`.
4. Open `http://localhost:3000`.
5. Click **Login** (or **Create account** to sign up as a new guest).
6. Browse hotels → open a hotel → view a room → **New Booking** → fill in
   stay details → **Continue to Payment** → **Pay Now**.
7. Go to `/reservations` to see your booking history, or log in as
   `admin@hotel.com` and visit `/admin` to manage everything.

## 12. Deploying to the Cloud

This is three separate deployments (database, backend, frontend), each on
its own free/low-cost tier. None of them require touching the code beyond
the CORS fix already built in (Section 9 / `app.cors.allowed-origins`).

### Step 1 — Database (MySQL)

Any managed MySQL works. Easy free-tier options: **Railway** (MySQL plugin),
**Aiven**, or **PlanetScale**. Create the database, then run
`database/schema.sql` against it (most providers give you a connection
string you can pass to `mysql -u ... -p ... -h ... < database/schema.sql`,
or use their web SQL console). Note the host, port, database name, username,
and password — the backend needs these next.

### Step 2 — Backend (Spring Boot)

Deploy the `backend/` folder to a Java host — **Railway** or **Render**
both auto-detect a Maven project and run `mvn spring-boot:run` for you with
zero config files needed. Set these environment variables on the platform
(Spring Boot reads env vars automatically — no code changes needed):

| Env var | Value |
|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://<db-host>:<db-port>/hotel_reservation?useSSL=false&serverTimezone=UTC` |
| `SPRING_DATASOURCE_USERNAME` | your DB username |
| `SPRING_DATASOURCE_PASSWORD` | your DB password |
| `JWT_SECRET` | a long random string, 32+ bytes (e.g. `openssl rand -base64 48`) - never reuse a value from the repo |
| `APP_SEED_DEMO_ACCOUNTS` | `false` - don't create the publicly documented demo logins in production |
| `APP_SEED_ADMIN_PASSWORD` | a strong password for the first admin account |
| `APP_CORS_ALLOWED_ORIGINS` | your frontend's URL once deployed in Step 3, e.g. `https://your-app.vercel.app` (you can come back and set this after Step 3) |

After it deploys, note the backend's public URL (e.g.
`https://your-backend.up.railway.app`) — the frontend needs it next.

### Step 3 — Frontend (Next.js)

**Vercel** is the simplest option for Next.js — connect your GitHub repo,
set the **root directory** to `frontend/`, and set this environment variable:

| Env var | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.up.railway.app/api` (the backend URL from Step 2, plus `/api`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Your Google Maps JavaScript API key (see Section 8) - optional, the site works without it |

Deploy. Then go back to Step 2's backend env vars and set
`APP_CORS_ALLOWED_ORIGINS` to your new Vercel URL (e.g.
`https://your-app.vercel.app`) so the browser is actually allowed to call
the API — without this step you'll see CORS errors in the browser console.

### Notes

- The three services can be swapped for others (e.g. AWS, DigitalOcean,
  Fly.io) — the only requirement is that the backend can reach the
  database, and the frontend knows the backend's public URL.
- `DataInitializer` seeds `admin@hotel.com` / `guest1-3@test.com` on first
  backend startup against whatever database it's pointed at, so the test
  accounts work in the cloud the same way they do locally.
- Multiple frontend origins (e.g. a preview URL and a production URL) can
  be set at once: `APP_CORS_ALLOWED_ORIGINS=https://prod.vercel.app,https://preview.vercel.app`.

## 13. How to Add Images

Every image slot uses the `ImagePlaceholder` component, which now renders a
**real photo automatically** if an `imageUrl` is set and the file loads
successfully — otherwise it falls back to the dashed-border placeholder (so
nothing breaks if a file is missing yet). To add real photos:

**Uploading photos from the admin screen (no file copying needed)**: log in
as ADMIN / HOTEL_OWNER (or HOTEL_STAFF with `MANAGE_HOTEL_INFO` / `MANAGE_ROOMS`),
open `/admin/hotels` (or `/admin/rooms`), edit the item and use the
**Upload image** button next to the main image or each gallery photo
(Gallery Images -> Add Image), then press Save. Files are checked by their
real content (JPG/PNG/GIF, max 8 MB), re-encoded by the server (EXIF/GPS
data is removed, large photos are scaled to 2400px; GIFs become a static PNG)
and stored on the backend under
`backend/uploads/images/` (override with `APP_UPLOAD_DIR`; set
`APP_UPLOAD_PUBLIC_BASE_URL` when the API is behind a proxy) and served at
`/uploads/images/**`. Back this folder up / mount it on a persistent volume
in production.

**Using Supabase (PostgreSQL) instead of MySQL**: open Supabase ->
SQL Editor, paste `database/schema-supabase.sql` and run it (it drops and
recreates every table, enables Row Level Security so the public Supabase
API cannot read your data, and seeds 20 real hotels with real coordinates).
Then start the backend with the `supabase` profile and the
`SUPABASE_DB_URL` / `SUPABASE_DB_USER` / `SUPABASE_DB_PASSWORD` environment
variables - see `backend/src/main/resources/application-supabase.properties`.
`schema-supabase.sql` refuses to run if the tables already exist (it would
`DROP` them); to deliberately wipe a development database, change
`confirm_reset` to `'yes'` in the SAFETY GUARD at the top of the file.
Connect with `sslmode=verify-full` and the Supabase CA certificate.

**Hotels are pre-wired**: `database/schema.sql` already sets `image_url` for
all 20 seeded hotels to a slug of their name (e.g.
`/images/hotels/mandarin-oriental-bangkok.jpg`). Just drop a correctly-named
file into `frontend/public/images/hotels/` and it appears automatically —
no need to touch `/admin/hotels` for the seeded hotels. Run the query below
to get the exact expected filename for every hotel:

```sql
SELECT name, image_url FROM hotels ORDER BY id;
```

1. Drop files into:
   ```
   frontend/public/images/hotels/
   frontend/public/images/rooms/
   frontend/public/images/facilities/
   frontend/public/images/login/
   ```
2. Point the relevant field at that path:
   - **Hotels**: set the Image path field on `/admin/hotels` (maps to
     `Hotel.imageUrl`), e.g. `/images/hotels/hotel-01.jpg`.
   - **Rooms**: set the Image path field on `/admin/rooms` (maps to
     `Room.imageUrl`), e.g. `/images/rooms/family-room.jpg`.
   - **Home hero**: drop a file at exactly `public/images/hotels/hero.jpg` —
     no admin field for this one, it's a fixed path checked by the homepage.
   - **Login / Register page**: drop a file at exactly
     `public/images/login/hotel-login.jpg`.
   - **Breakfast promo card**: drop a file at exactly
     `public/images/facilities/breakfast.jpg`, or pass a different
     `imageUrl` prop to `<PromoCard />` in code.
3. Recommended sizes: hotel/room cards `1200x800px`, hero image `16:9`
   landscape, login image `16:9` or `4:3` landscape.

Note: the Room Detail gallery and Hotel Detail gallery only show one real
photo (the main shot) per hotel/room today — the smaller thumbnail slots
stay as placeholders since the database only stores a single `imageUrl`
each. Add a `RoomAmenity`-style child table (e.g. `RoomImage`) if you want
to store and display multiple photos per room.

## 14. How to Create a Reservation (walkthrough)

1. `POST /api/auth/register` with `fullName`, `email`, `password` (and optional
   `phone`) → creates a User + linked Guest, returns a JWT and `guestId`.
   (Or `POST /api/auth/login` if the account already exists.)
2. `GET /api/hotels` → pick a hotel → `GET /api/rooms?hotelId={id}`.
3. `POST /api/reservations` (with `Authorization: Bearer {token}`) using the
   `guestId` from step 1, plus `roomId`, `checkInDate`, `checkOutDate`,
   `numberOfGuests`. The backend:
   - verifies the `guestId` belongs to the logged-in user (unless ADMIN),
   - rejects overlapping bookings for that room,
   - rejects if `numberOfGuests` exceeds room capacity,
   - rejects if check-out is not after check-in,
   - calculates `totalPrice` server-side (nights × price/night),
   - marks the room `OCCUPIED`.
4. `POST /api/payments` with `reservationId`, `amount` (must match total),
   `paymentMethod` → reservation moves to `CONFIRMED`.
5. `GET /api/reservations/me` any time to see your own bookings and their
   current status (or `GET /api/reservations/{id}` for one specific booking).

## 15. How to Test

- **Manual via UI**: follow the walkthrough above at `http://localhost:3000`.
- **Manual via API**: use `curl` or Postman against `http://localhost:8080/api`
  — remember to send the JWT from `/api/auth/login` as `Authorization: Bearer {token}`.
- **Double-booking check**: try creating two reservations for the same room
  with overlapping dates — the second should fail with `409 Room Not Available`.
- **Validation check**: try `checkOutDate` before `checkInDate`, or
  `numberOfGuests` greater than room capacity — both return `400 Bad Request`.
- **Authorization check**: try calling an ADMIN-only endpoint (e.g.
  `POST /api/hotels`) while logged in as a GUEST — expect `403 Forbidden`.
  Try calling any protected endpoint with no token — expect `401 Unauthorized`.

### Test Accounts

> These credentials are documented **only here**. They are deliberately not
> shown on the login page, in source comments or in the logs. They exist only
> while `APP_SEED_DEMO_ACCOUNTS=true` (the local-development default) and
> `admin@hotel.com` keeps the demo password unless you set
> `APP_SEED_ADMIN_PASSWORD` **before the first start**. Never deploy publicly
> with these accounts enabled.

`DataInitializer` (a Spring `CommandLineRunner`) seeds these automatically
every time the backend starts, so they're ready to use immediately:

| Login | Password | Role | What it demonstrates |
|---|---|---|---|
| **admin@hotel.com** | `admin123` | ADMIN | Manage the dashboard, add rooms, confirm/cancel, check-in/check-out at `/admin`. Also the only role that can record a payout as paid or change a hotel's commission rate - see `/admin/payouts` |
| **owner1@hotel.com** | `Owner@2026!` | HOTEL_OWNER | Manages Mandarin Oriental, Bangkok (hotel id 1) only. Visit `/admin/payouts` to see this hotel's `PENDING` payout (from Somchai's reservation 1) and its 15% commission rate (view-only - only ADMIN can change it) |
| **owner6@hotel.com** | `Owner@2026!` | HOTEL_OWNER | Manages Shangri-La Chiang Mai (hotel id 6). Its payout (from guest1's reservation 2) is already `PAID` - `/admin/payouts` shows what settled payout history looks like |
| *(owner2 .. owner20@hotel.com)* | `Owner@2026!` | HOTEL_OWNER | Same pattern, one account per remaining hotel - see `DataInitializer.java` |
| **guest1@test.com** | `guest123` | GUEST | A fully successful flow: booked, paid, confirmed. Has a `CONFIRMED` + `PAID` reservation (room id 36 - Shangri-La Chiang Mai SUITE, 2026-10-10 → 2026-10-13) and a second, already-completed stay (room id 7 - The Peninsula Bangkok, `CHECKED_OUT`) with a seeded review. Log in and visit `/reservations` for the booking history, or `/reservations/history` to demo "Edit review" on the completed stay |
| **guest2@test.com** | `guest123` | GUEST | Testing `409 Room Not Available`. From `/rooms/36`, click **New Booking** and try to book overlapping dates (e.g. 2026-10-11 → 2026-10-12) — the API rejects the double-booking |
| **guest3@test.com** | `guest123` | GUEST | Testing cancellation and `400 Bad Request`. Has a `PENDING` reservation (id 3). Log in, go to `/reservations`, cancel it, or send `PUT /api/reservations/3` (as admin) with `checkOutDate` before `checkInDate` to see the validation error |

You can also click **Create account** on `/login` to register a brand new
guest at any time — that goes through the real `/api/auth/register` endpoint.
To try the "Write a review" flow from scratch: as `admin@hotel.com`, check
any `CONFIRMED` reservation in through `/admin` (check-in, then check-out) to
make it `CHECKED_OUT`, then log in as the guest who booked it and open
`/reservations/history`.

To try the payouts flow end to end: log in as `admin@hotel.com` and open
`/admin/payouts` - pick "The Peninsula Bangkok" (or leave "All hotels") and
click **Mark as paid** on its `PENDING` payout, filling in a payout method
and reference. Refresh as `owner2@hotel.com` afterward to see it show up as
`PAID` from the hotel's side. To see a rate change take effect, edit the
commission rate for a hotel with no payouts yet (anything other than 1, 2,
or 6), then pay for a new booking there - the new payout will use the
updated rate, while every existing payout keeps the rate it was actually
charged under.

## 16. Common Errors & Fixes

| Error | Likely cause | Fix |
|---|---|---|
| `Communications link failure` on backend startup | MySQL not running, or wrong host/port | Start MySQL; verify `spring.datasource.url` |
| `Access denied for user 'root'@'localhost'` | Wrong password in `application.properties` | Update `spring.datasource.password` |
| Frontend shows "No hotels found" | Backend not running, or DB not seeded | Start backend; run `database/schema.sql` |
| CORS error in browser console | Frontend running on a port other than 3000 | Update `corsConfigurationSource()` in `SecurityConfig.java` |
| `401 Unauthorized` | No/expired JWT sent, or user not logged in | Log in again; check `Authorization: Bearer {token}` header |
| `403 Forbidden` | Logged in, but wrong role (e.g. GUEST hitting an ADMIN route) or trying to access another guest's reservation | Log in as `admin@hotel.com` for admin actions, or use the account that owns the resource |
| `409 Room Not Available` | Selected dates overlap an existing reservation for that room | Choose different dates or a different room |
| `400 Bad Request` on booking | Check-out before check-in, or guests > capacity | Fix the form inputs |
| Admin pages keep redirecting to `/login` | The `hotel_auth_role` cookie is missing/stale, or the account isn't ADMIN | Log out and back in as `admin@hotel.com`; check devtools cookies |

## 17. Project Structure

```
hotel-reservation-system/
├── backend/
│   ├── pom.xml
│   └── src/main/java/com/hotel/reservation/
│       ├── HotelReservationApplication.java
│       ├── controller/   (HotelController, RoomController, GuestController,
│       │                  ReservationController, PaymentController,
│       │                  ReviewController, PayoutController, AuthController)
│       ├── service/      (business rules incl. double-booking prevention,
│       │                  ownership checks, AuthService, ReviewService -
│       │                  only lets a CHECKED_OUT stay be reviewed once,
│       │                  PayoutService - auto-creates a Payout per Payment,
│       │                  net of the hotel's commission)
│       ├── repository/   (Spring Data JPA interfaces, incl. UserRepository,
│       │                  ReviewRepository, PayoutRepository)
│       ├── entity/       (Hotel, Room, RoomAmenity, Guest, Reservation,
│       │                  Payment, User, Review, Payout, enums incl. Role,
│       │                  AmenityCategory, PayoutStatus, PayoutMethod)
│       ├── dto/          (validated request bodies, incl. RoomAmenityDto,
│       │                  RegisterRequest, LoginRequest, AuthResponse,
│       │                  ReviewDto, ReviewResponseDto, ReviewSummaryDto,
│       │                  PayoutPaymentDto, PayoutSummaryDto, CommissionRateDto)
│       ├── security/     (JwtService, JwtAuthenticationFilter,
│       │                  CustomUserDetailsService, CurrentUserProvider)
│       ├── exception/    (custom exceptions + GlobalExceptionHandler)
│       └── config/       (SecurityConfig - JWT filter chain, CORS, route
│                          authorization; DataInitializer - seeds admin/test
│                          guest logins on startup)
├── frontend/
│   ├── app/              (Next.js App Router pages, see below)
│   ├── components/       (Navbar, Sidebar, Footer, HotelCard, RoomCard,
│   │                      RoomHeroGallery, RoomAmenitiesSidebar,
│   │                      AvailabilityCalendar, AdvanceBookingList,
│   │                      PromoCard, HotelMap, StarRating, ReviewFormModal,
│   │                      HotelReviews, ...)
│   ├── lib/               (api.ts - all fetch calls incl. auth + token
│   │                      handling, types.ts - shared types,
│   │                      auth-context.tsx - AuthProvider/useAuth)
│   ├── middleware.ts     (edge-level /admin/** guard based on role cookie)
│   └── public/images/    (hotels/rooms/facilities/login - drop real photos here)
├── database/
│   └── schema.sql        (DDL + seed data: 20 hotels, 120 rooms - every
│                          hotel offers all 6 room types - users table
│                          structure - passwords seeded by DataInitializer)
├── README.md
└── .gitignore
```

### Frontend pages
```
/                      Home (hero, search, featured hotels)
/login                 Login - calls POST /api/auth/login
/register              Create account - calls POST /api/auth/register
/hotels                Hotel list with filters
/hotels/[id]           Hotel detail (gallery, rooms, map + "Get directions"
                       widget, guest reviews - average rating + "Write a
                       review" for eligible logged-in guests)
/rooms/[id]            Room detail: hero gallery + badges, availability
                       calendar, amenities sidebar, advance booking list,
                       complimentary breakfast promo card
/booking               Booking form + live price summary (requires login)
/payment               Payment form → success screen (requires login)
/reservations          My reservations - GET /api/reservations/me (requires login)
/reservations/[id]     Reservation detail with status timeline (owner or admin)
/reservations/history  Checked-out + cancelled stays - write/edit a review
                       on any completed stay (requires login)
/admin                 Dashboard (stats, charts, recent reservations) -
                       ADMIN, HOTEL_OWNER, or HOTEL_STAFF (scoped to their own hotel)
/admin/hotels          Hotel CRUD - ADMIN can create/delete any hotel; a
                       hotel's own HOTEL_OWNER/HOTEL_STAFF with
                       MANAGE_HOTEL_INFO can edit (not create/delete) theirs
/admin/rooms           Room CRUD + status change (incl. floor, amenities via
                       API) - ADMIN, or a hotel's own HOTEL_OWNER/HOTEL_STAFF
                       with MANAGE_ROOMS
/admin/reservations    Reservation management (confirm/cancel/check-in/out) -
                       ADMIN, or a hotel's own HOTEL_OWNER/HOTEL_STAFF with
                       MANAGE_RESERVATIONS or VIEW_FINANCE
/admin/payouts         Payouts dashboard: what the platform owes each hotel
                       net of commission, and payout history. ADMIN sees
                       every hotel (with a hotel filter) and can mark a
                       payout as paid or change a hotel's commission rate;
                       a hotel's own HOTEL_OWNER/HOTEL_STAFF with
                       VIEW_FINANCE see their own hotel's payouts read-only
/admin/staff           Manage a hotel's HOTEL_STAFF accounts + permissions -
                       ADMIN or that hotel's HOTEL_OWNER
```

## 18. Design System

| Token | Value |
|---|---|
| Background | `#F7F3EC` |
| Primary | `#A88A5A` |
| Dark | `#292722` |
| Secondary | `#D8C8AD` |
| Card | `#FFFFFF` |
| Text | `#3A3834` |
| Muted | `#8B877F` |

Rounded cards (`20px`), soft shadows, generous whitespace, minimal color use —
warm, earth-toned, premium rather than a generic admin-dashboard look.
