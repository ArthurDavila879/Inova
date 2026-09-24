package com.inova.controller;

import com.inova.dto.auth.*;
import com.inova.dto.user.LocationRequest;
import com.inova.service.AuthService;
import com.inova.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/auth", "/api/v1/auth"})
public class AuthController {
    private final AuthService auth;
    private final UserService users;

    public AuthController(AuthService a, UserService u) {
        auth = a;
        users = u;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest r) {
        return ResponseEntity.ok(auth.register(r));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest r) {
        return ResponseEntity.ok(auth.login(r));
    }

    @PutMapping("/location")
    public ResponseEntity<?> location(Authentication a, @Valid @RequestBody LocationRequest r) {
        return ResponseEntity.ok(users.updateLocation(id(a), r));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication a) {
        return ResponseEntity.ok(users.me(id(a)));
    }

    private Long id(Authentication a) {
        return Long.valueOf(a.getName());
    }
}
