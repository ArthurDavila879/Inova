package com.inova.controller;

import com.inova.service.UserService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    private final UserService users;

    public UserController(UserService u) {
        users = u;
    }

    @GetMapping("/me")
    public Object me(Authentication a) {
        return users.me(Long.valueOf(a.getName()));
    }

    @PutMapping("/me/location")
    public Object location(Authentication a, @jakarta.validation.Valid @RequestBody com.inova.dto.user.LocationRequest r) {
        return users.updateLocation(Long.valueOf(a.getName()), r);
    }

    @PutMapping("/me")
    public Object update(Authentication a, @jakarta.validation.Valid @RequestBody com.inova.dto.user.ProfileRequest r) {
        return users.updateProfile(Long.valueOf(a.getName()), r);
    }
}
