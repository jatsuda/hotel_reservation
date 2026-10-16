package com.hotel.reservation.service;

import com.hotel.reservation.dto.CancelReservationDto;
import com.hotel.reservation.dto.ReservationDto;
import com.hotel.reservation.dto.UpcomingReservationDto;
import com.hotel.reservation.entity.*;
import com.hotel.reservation.exception.BadRequestException;
import com.hotel.reservation.exception.ResourceNotFoundException;
import com.hotel.reservation.exception.RoomNotAvailableException;
import com.hotel.reservation.repository.GuestRepository;
import com.hotel.reservation.repository.PaymentRepository;
import com.hotel.reservation.repository.ReservationRepository;
import com.hotel.reservation.repository.RoomRepository;
import com.hotel.reservation.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final RoomRepository roomRepository;
    private final GuestRepository guestRepository;
    private final PaymentRepository paymentRepository;
    private final PayoutService payoutService;
    private final CurrentUserProvider currentUserProvider;

    // ---------- Business rule matrix ----------
    // Which current ReservationStatus values each action may run from. Checked
    // by assertTransition() before every status-changing action, so an
    // already-checked-out or already-cancelled reservation (etc.) can never be
    // re-processed through the wrong action.
    //
    //   Action     | PENDING | CONFIRMED | CHECKED_IN | CHECKED_OUT | CANCELLED
    //   -----------|---------|-----------|------------|-------------|----------
    //   check-in   |    -    |     Y     |     -      |      -      |    -
    //   check-out  |    -    |     -     |     Y      |      -      |    -
    //   cancel     |    Y    |     Y     |     Y      |      -      |    -
    private static final Set<ReservationStatus> CHECK_IN_FROM = EnumSet.of(ReservationStatus.CONFIRMED);
    private static final Set<ReservationStatus> CHECK_OUT_FROM = EnumSet.of(ReservationStatus.CHECKED_IN);
    private static final Set<ReservationStatus> CANCEL_FROM =
            EnumSet.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN);

    // Only these reservations may still be edited through PUT /api/reservations/{id}.
    private static final Set<ReservationStatus> EDITABLE_STATUSES =
            EnumSet.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED);

    private void assertTransition(Reservation reservation, Set<ReservationStatus> allowedFrom, String action) {
        if (!allowedFrom.contains(reservation.getStatus())) {
            throw new BadRequestException(
                    "Cannot " + action + " a reservation that is currently " + reservation.getStatus());
        }
    }

    public List<Reservation> getAllReservations() {
        return reservationRepository.findAll();
    }

    /**
     * Powers GET /api/reservations for every role that can reach it:
     *  - ADMIN: all reservations, or just one hotel's if hotelId is passed
     *  - HOTEL_OWNER / HOTEL_STAFF: always scoped to their own linked hotel
     *    (passing a different hotelId is rejected rather than silently
     *    ignored); a HOTEL_STAFF account additionally needs VIEW_FINANCE or
     *    MANAGE_RESERVATIONS to see the list at all.
     */
    public List<Reservation> getReservations(Long hotelId) {
        User currentUser = currentUserProvider.getCurrentUser();

        if (currentUser != null && (currentUser.getRole() == Role.HOTEL_OWNER || currentUser.getRole() == Role.HOTEL_STAFF)) {
            Long ownHotelId = currentUser.getHotel() != null ? currentUser.getHotel().getId() : null;
            if (ownHotelId == null) {
                throw new BadRequestException("This account is not linked to a hotel");
            }
            if (hotelId != null && !hotelId.equals(ownHotelId)) {
                throw new AccessDeniedException("You do not have access to this hotel's reservations");
            }
            if (!currentUserProvider.canViewFinance(ownHotelId)) {
                throw new AccessDeniedException("You do not have permission to view this hotel's reservations");
            }
            return reservationRepository.findByRoom_Hotel_Id(ownHotelId);
        }

        if (hotelId != null) {
            return reservationRepository.findByRoom_Hotel_Id(hotelId);
        }
        return reservationRepository.findAll();
    }

    public Reservation getReservationById(Long id) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found with id: " + id));
        assertOwnerOrAdmin(reservation);
        return reservation;
    }

    /**
     * GET /api/reservations?guestId=... - previously returned ANY guest's
     * reservations to any HOTEL_OWNER/HOTEL_STAFF (an IDOR: guest ids are
     * sequential and the result included contact details and payments for every
     * hotel). Now: ADMIN sees everything for that guest; HOTEL_OWNER/HOTEL_STAFF
     * only see that guest's reservations at their OWN hotel (and need
     * VIEW_FINANCE / MANAGE_RESERVATIONS for staff); a GUEST only their own.
     */
    public List<Reservation> getReservationsByGuest(Long guestId) {
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required");
        }
        if (currentUser.getRole() == Role.ADMIN) {
            return reservationRepository.findByGuestId(guestId);
        }
        if (currentUser.getRole() == Role.HOTEL_OWNER || currentUser.getRole() == Role.HOTEL_STAFF) {
            Long ownHotelId = currentUser.getHotel() != null ? currentUser.getHotel().getId() : null;
            if (ownHotelId == null || !currentUserProvider.canViewFinance(ownHotelId)) {
                throw new AccessDeniedException("You do not have permission to view these reservations");
            }
            return reservationRepository.findByGuestId(guestId).stream()
                    .filter(r -> r.getRoom().getHotel().getId().equals(ownHotelId))
                    .toList();
        }
        if (currentUser.getGuest() != null && currentUser.getGuest().getId().equals(guestId)) {
            return reservationRepository.findByGuestId(guestId);
        }
        throw new AccessDeniedException("You do not have access to this guest's reservations");
    }

    /**
     * Reservations belonging to the currently authenticated user, resolved
     * from their linked Guest profile. Powers the "My Reservations" page
     * without requiring the guestId to be guessable/passed by the client.
     */
    public List<Reservation> getMyReservations() {
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser == null || currentUser.getGuest() == null) {
            throw new BadRequestException("This account has no guest profile to look up reservations for");
        }
        return reservationRepository.findByGuestId(currentUser.getGuest().getId());
    }

    /**
     * Ensures the currently authenticated user may at least *view* this
     * reservation: any ADMIN; the HOTEL_OWNER of its hotel; a HOTEL_STAFF of
     * its hotel with VIEW_FINANCE or MANAGE_RESERVATIONS; or the GUEST who
     * owns it. Throws otherwise. Called from every read/write path so
     * nobody can see or touch another guest's/hotel's booking.
     * Mutating actions (update/cancel/check-in/check-out/delete) layer an
     * additional {@link #assertCanManageIfStaff} check on top of this.
     */
    private void assertOwnerOrAdmin(Reservation reservation) {
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required");
        }
        if (currentUser.getRole() == Role.ADMIN) {
            return;
        }
        if (currentUser.getRole() == Role.HOTEL_OWNER || currentUser.getRole() == Role.HOTEL_STAFF) {
            Long hotelId = reservation.getRoom().getHotel().getId();
            boolean ownsHotel = currentUser.getHotel() != null && currentUser.getHotel().getId().equals(hotelId);
            if (ownsHotel && (currentUser.getRole() == Role.HOTEL_OWNER || currentUserProvider.canViewFinance(hotelId))) {
                return;
            }
            throw new AccessDeniedException("You do not have access to this reservation");
        }
        boolean owns = currentUser.getGuest() != null
                && currentUser.getGuest().getId().equals(reservation.getGuest().getId());
        if (!owns) {
            throw new AccessDeniedException("You do not have access to this reservation");
        }
    }

    /**
     * Extra check layered on top of {@link #assertOwnerOrAdmin} before any
     * mutating action. ADMIN/HOTEL_OWNER/GUEST are unaffected (they already
     * fully passed the check above); a HOTEL_STAFF additionally needs
     * MANAGE_RESERVATIONS specifically - VIEW_FINANCE alone only grants
     * read access.
     */
    private void assertCanManageIfStaff(Reservation reservation) {
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser != null && currentUser.getRole() == Role.HOTEL_STAFF) {
            Long hotelId = reservation.getRoom().getHotel().getId();
            if (!currentUserProvider.canManageReservations(hotelId)) {
                throw new AccessDeniedException("You do not have permission to manage this hotel's reservations");
            }
        }
    }

    /**
     * Upcoming (today or later, non-cancelled) reservations for a single room,
     * soonest first. Powers the Room Detail page's "Advance Booking" widget
     * and the Availability Calendar's highlighted dates.
     */
    public List<UpcomingReservationDto> getUpcomingReservationsByRoom(Long roomId) {
        return reservationRepository.findUpcomingByRoomId(roomId, java.time.LocalDate.now()).stream()
                .map(r -> new UpcomingReservationDto(
                        r.getId(),
                        r.getCheckInDate(),
                        r.getCheckOutDate(),
                        r.getStatus(),
                        new UpcomingReservationDto.GuestSummary(
                                r.getGuest().getFirstName(),
                                initialOf(r.getGuest().getLastName()))))
                .toList();
    }

    private static String initialOf(String name) {
        return (name == null || name.isBlank()) ? "" : name.trim().substring(0, 1);
    }

    /**
     * Creates a reservation after enforcing every business rule requested by the spec:
     *   - check-out date must be after check-in date
     *   - number of guests must not exceed room capacity
     *   - the room must be AVAILABLE (not under maintenance / permanently occupied)
     *   - the room must not already be booked for an overlapping date range
     * Total price is calculated server-side (nights * pricePerNight) so the
     * frontend can never manipulate the amount charged.
     */
    public Reservation createReservation(ReservationDto dto) {
        // Who may create a reservation, and for whom - checked BEFORE any
        // lookup so guest/room ids can't be probed by unauthorised callers.
        // A GUEST-role user may only ever book on their own behalf; only
        // ADMIN (e.g. front-desk staff) can create a reservation for
        // someone else's guest profile. HOTEL_OWNER / HOTEL_STAFF accounts
        // used to slip through here and could book on ANY guest id.
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required");
        }
        if (currentUser.getRole() == Role.GUEST) {
            if (currentUser.getGuest() == null || !currentUser.getGuest().getId().equals(dto.getGuestId())) {
                throw new AccessDeniedException("You can only create reservations for your own account");
            }
        } else if (currentUser.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only guests or platform admins can create reservations");
        }

        // Lock the room row so the overlap check below and the insert are
        // atomic with respect to other bookings of the same room.
        Room room = roomRepository.findByIdForUpdate(dto.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + dto.getRoomId()));

        Guest guest = guestRepository.findById(dto.getGuestId())
                .orElseThrow(() -> new ResourceNotFoundException("Guest not found with id: " + dto.getGuestId()));

        validateDates(dto);
        validateCapacity(dto, room, dto.getNumberOfRooms() == null ? 1 : dto.getNumberOfRooms());
        validateRoomStatus(room);
        validateNoOverlap(dto.getRoomId(), dto, null);

        long nights = ChronoUnit.DAYS.between(dto.getCheckInDate(), dto.getCheckOutDate());
        BigDecimal totalPrice = room.getPricePerNight()
                .multiply(BigDecimal.valueOf(nights))
                .multiply(BigDecimal.valueOf(dto.getNumberOfRooms() == null ? 1 : dto.getNumberOfRooms()));

        Reservation reservation = new Reservation();
        reservation.setGuest(guest);
        reservation.setRoom(room);
        reservation.setCheckInDate(dto.getCheckInDate());
        reservation.setCheckOutDate(dto.getCheckOutDate());
        reservation.setNumberOfGuests(dto.getNumberOfGuests());
        reservation.setNumberOfRooms(dto.getNumberOfRooms() == null ? 1 : dto.getNumberOfRooms());
        reservation.setSpecialRequest(dto.getSpecialRequest());
        reservation.setStatus(ReservationStatus.PENDING);
        reservation.setTotalPrice(totalPrice);

        Reservation saved = reservationRepository.save(reservation);
        return saved;
    }

    public Reservation updateReservation(Long id, ReservationDto dto) {
        Reservation reservation = getReservationById(id);
        assertCanManageIfStaff(reservation);

        // A cancelled / checked-in / checked-out reservation is a closed
        // record (money, room status and audit trail already depend on it).
        if (!EDITABLE_STATUSES.contains(reservation.getStatus())) {
            throw new BadRequestException(
                    "Cannot edit a reservation that is currently " + reservation.getStatus());
        }

        if (dto.getCheckInDate() != null && dto.getCheckOutDate() != null) {
            validateDates(dto);
            // Changing dates re-prices the booking. After a successful payment
            // that would silently desync the amount charged from the amount owed.
            if (reservation.getPayment() != null
                    && reservation.getPayment().getPaymentStatus() == PaymentStatus.PAID) {
                throw new BadRequestException(
                        "Dates cannot be changed after payment. Cancel (refund) and rebook instead.");
            }
            // Same room lock as createReservation - serialise concurrent edits/bookings.
            roomRepository.findByIdForUpdate(reservation.getRoom().getId());
            validateNoOverlap(reservation.getRoom().getId(), dto, id);
            reservation.setCheckInDate(dto.getCheckInDate());
            reservation.setCheckOutDate(dto.getCheckOutDate());

            long nights = ChronoUnit.DAYS.between(dto.getCheckInDate(), dto.getCheckOutDate());
            BigDecimal totalPrice = reservation.getRoom().getPricePerNight()
                    .multiply(BigDecimal.valueOf(nights))
                    .multiply(BigDecimal.valueOf(reservation.getNumberOfRooms()));
            reservation.setTotalPrice(totalPrice);
        }

        if (dto.getNumberOfGuests() != null) {
            if (dto.getNumberOfGuests() < 1) {
                throw new BadRequestException("There must be at least 1 guest");
            }
            validateCapacity(dto, reservation.getRoom(), reservation.getNumberOfRooms());
            reservation.setNumberOfGuests(dto.getNumberOfGuests());
        }

        if (dto.getSpecialRequest() != null) {
            // PUT isn't bean-validated (its fields are optional), so enforce the
            // same 1000-character cap that POST gets from ReservationDto.
            if (dto.getSpecialRequest().length() > 1000) {
                throw new BadRequestException("Special request must be at most 1000 characters");
            }
            reservation.setSpecialRequest(dto.getSpecialRequest());
        }

        if (dto.getStatus() != null) {
            // This raw field only exists for the manual PENDING <-> CONFIRMED
            // toggle (see PaymentService and the admin "Confirm" button).
            // CANCELLED must go through cancelReservation() (reason, audit
            // trail, refund) and CHECKED_IN / CHECKED_OUT through their own
            // endpoints (room status side effects). Accepting them here let a
            // caller skip all of that - e.g. mark a stay checked-out without
            // ever checking in.
            if (dto.getStatus() != ReservationStatus.PENDING && dto.getStatus() != ReservationStatus.CONFIRMED) {
                throw new BadRequestException(
                        "Status can only be set to PENDING or CONFIRMED here. Use the cancel / check-in / check-out endpoints for other changes.");
            }
            reservation.setStatus(dto.getStatus());
        }

        return reservationRepository.save(reservation);
    }

    /**
     * Single entry point for cancelling a reservation - this is also the
     * platform's only refund trigger, so "cancel" and "refund" can never
     * drift out of sync (previously PaymentService.updatePayment had its own
     * separate copy of the cancel side-effects). Cancelling a reservation
     * with a PAID payment always refunds it and cancels its payout in the
     * same transaction; there is no way to cancel without refunding, or to
     * refund without cancelling.
     *
     * Only frees the room if this reservation was actually the one occupying
     * it (i.e. the guest had already checked in) - otherwise cancelling an
     * unrelated future/pending booking on a room that's currently occupied by
     * a *different*, still-checked-in guest would incorrectly mark that room
     * AVAILABLE out from under them.
     *
     * `reason` is required from HOTEL_STAFF/HOTEL_OWNER/ADMIN (audit trail for
     * later review - see Reservation.cancelReason/cancelledBy/cancelledAt); a
     * GUEST cancelling their own booking may leave it blank.
     */
    public Reservation cancelReservation(Long id, CancelReservationDto dto) {
        Reservation reservation = getReservationById(id); // includes ownership/view check
        assertCanManageIfStaff(reservation);
        assertTransition(reservation, CANCEL_FROM, "cancel");

        User currentUser = currentUserProvider.getCurrentUser();
        // A guest who is already checked in must not be able to cancel their own
        // stay and trigger a full refund of a stay they are using - the hotel
        // handles that case (it also has to settle the payout).
        if (currentUser != null && currentUser.getRole() == Role.GUEST
                && reservation.getStatus() == ReservationStatus.CHECKED_IN) {
            throw new AccessDeniedException(
                    "This stay has already started. Please contact the hotel to cancel or change it.");
        }
        boolean actingOnSomeoneElsesBehalf = currentUser != null
                && (currentUser.getRole() == Role.ADMIN
                    || currentUser.getRole() == Role.HOTEL_OWNER
                    || currentUser.getRole() == Role.HOTEL_STAFF);
        String reason = dto != null ? dto.getReason() : null;
        if (reason != null && reason.length() > 500) {
            throw new BadRequestException("Reason must be at most 500 characters");
        }
        if (actingOnSomeoneElsesBehalf && (reason == null || reason.isBlank())) {
            throw new BadRequestException("A cancellation reason is required");
        }

        boolean wasOccupyingRoom = reservation.getStatus() == ReservationStatus.CHECKED_IN;

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setCancelReason(reason != null && !reason.isBlank() ? reason : "Cancelled by guest");
        reservation.setCancelledAt(LocalDateTime.now());
        reservation.setCancelledBy(currentUser != null ? currentUser.getEmail() : null);
        reservationRepository.save(reservation);

        if (wasOccupyingRoom) {
            Room room = reservation.getRoom();
            room.setStatus(RoomStatus.AVAILABLE);
            roomRepository.save(room);
        }

        // The unified refund: the guest already paid (Payment is PAID), so
        // cancelling means the platform owes them their money back, and no
        // longer owes the hotel anything for it (unless the payout was
        // already paid out - see PayoutService.cancelForPayment).
        Payment payment = reservation.getPayment();
        if (payment != null && payment.getPaymentStatus() == PaymentStatus.PAID) {
            payment.setPaymentStatus(PaymentStatus.REFUNDED);
            paymentRepository.save(payment);
            payoutService.cancelForPayment(payment);
        }

        return reservation;
    }

    /**
     * Marks the guest as physically checked in. This is also the moment the
     * room's status becomes OCCUPIED - not at booking time - so that a room
     * with a future/upcoming reservation still shows as bookable (for
     * different, non-overlapping dates) right up until the guest actually
     * arrives. Real date-conflict prevention is handled separately by
     * {@link #validateNoOverlap}, which is what actually stops two
     * reservations from double-booking the same room for the same dates.
     */
    public Reservation checkIn(Long id) {
        Reservation reservation = getReservationById(id);
        assertCanManageIfStaff(reservation);
        assertTransition(reservation, CHECK_IN_FROM, "check in");
        reservation.setStatus(ReservationStatus.CHECKED_IN);
        Reservation saved = reservationRepository.save(reservation);

        Room room = reservation.getRoom();
        room.setStatus(RoomStatus.OCCUPIED);
        roomRepository.save(room);

        return saved;
    }

    public Reservation checkOut(Long id) {
        Reservation reservation = getReservationById(id);
        assertCanManageIfStaff(reservation);
        assertTransition(reservation, CHECK_OUT_FROM, "check out");
        reservation.setStatus(ReservationStatus.CHECKED_OUT);
        Reservation saved = reservationRepository.save(reservation);

        Room room = reservation.getRoom();
        room.setStatus(RoomStatus.AVAILABLE);
        roomRepository.save(room);

        return saved;
    }

    public void deleteReservation(Long id) {
        // Route security already limits this to ADMIN; enforce it here too so a
        // future route change can't expose hard-deletes to owners/guests.
        if (!currentUserProvider.isAdmin()) {
            throw new AccessDeniedException("Only platform admins can delete reservations");
        }
        Reservation reservation = getReservationById(id);
        reservationRepository.delete(reservation);
    }

    // ---------- Validation helpers ----------

    private void validateDates(ReservationDto dto) {
        if (!dto.getCheckOutDate().isAfter(dto.getCheckInDate())) {
            throw new BadRequestException("Check-out date must be after check-in date");
        }
    }

    /**
     * Capacity must cover the number of physical rooms being booked, not
     * just one - a reservation for 3 rooms of a 2-person room should allow
     * up to 6 guests, matching how totalPrice already scales by
     * numberOfRooms. Each call site passes the *effective* room count: the
     * requested amount on create, or the reservation's already-committed
     * amount on update (since numberOfRooms itself isn't editable via this
     * dto path).
     */
    private void validateCapacity(ReservationDto dto, Room room, int numberOfRooms) {
        int maxCapacity = room.getCapacity() * numberOfRooms;
        if (dto.getNumberOfGuests() > maxCapacity) {
            throw new BadRequestException(
                    "Number of guests (" + dto.getNumberOfGuests() + ") exceeds capacity for "
                            + numberOfRooms + " room(s) (" + maxCapacity + ")");
        }
    }

    private void validateRoomStatus(Room room) {
        if (room.getStatus() == RoomStatus.MAINTENANCE) {
            throw new RoomNotAvailableException("Room " + room.getRoomNumber() + " is under maintenance and cannot be booked");
        }
    }

    private void validateNoOverlap(Long roomId, ReservationDto dto, Long excludeReservationId) {
        List<Reservation> overlaps = (excludeReservationId == null)
                ? reservationRepository.findOverlappingReservations(roomId, dto.getCheckInDate(), dto.getCheckOutDate())
                : reservationRepository.findOverlappingReservationsExcluding(roomId, dto.getCheckInDate(), dto.getCheckOutDate(), excludeReservationId);

        if (!overlaps.isEmpty()) {
            throw new RoomNotAvailableException("This room is already reserved for the selected dates");
        }
    }
}
