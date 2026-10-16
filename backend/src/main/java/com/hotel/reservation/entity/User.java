package com.hotel.reservation.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * The authentication identity. Kept separate from {@link Guest} (the
 * booking/profile record) so the existing Reservation -> Guest relationship
 * didn't need to change: a GUEST-role User is linked 1:1 to a Guest row via
 * {@code guest_id}. An ADMIN-role User has no linked Guest.
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    // Only populated for GUEST-role users; an ADMIN has no Guest profile.
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guest_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Guest guest;

    // Populated for HOTEL_OWNER and HOTEL_STAFF-role users - the single
    // hotel this account is allowed to touch (see
    // CurrentUserProvider.canManageHotel/canManageRooms/etc). ADMIN and
    // GUEST users have no linked Hotel.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hotel_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "rooms", "images"})
    private Hotel hotel;

    // Only meaningful for HOTEL_STAFF-role users - which of that hotel's
    // areas this account may manage (see entity/Permission.java). Empty for
    // every other role: an ADMIN or HOTEL_OWNER has full access to whatever
    // hotel(s) they're allowed to touch regardless of this set.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_permissions", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "permission")
    @Enumerated(EnumType.STRING)
    private Set<Permission> permissions = new HashSet<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // ---------------- UserDetails ----------------

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
