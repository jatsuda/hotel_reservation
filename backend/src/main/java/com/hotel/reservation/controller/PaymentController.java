package com.hotel.reservation.controller;

import com.hotel.reservation.dto.PaymentDto;
import com.hotel.reservation.entity.Payment;
import com.hotel.reservation.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping
    public ResponseEntity<List<Payment>> getAllPayments() {
        return ResponseEntity.ok(paymentService.getAllPayments());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Payment> getPaymentById(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.getPaymentById(id));
    }

    @PostMapping
    public ResponseEntity<Payment> createPayment(@Valid @RequestBody PaymentDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.createPayment(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Payment> updatePayment(@PathVariable Long id, @RequestBody PaymentDto dto) {
        return ResponseEntity.ok(paymentService.updatePayment(id, dto));
    }
}
