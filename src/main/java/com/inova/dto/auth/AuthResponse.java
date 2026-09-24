package com.inova.dto.auth;

import com.inova.dto.user.UserResponse;

public record AuthResponse(String token, UserResponse user) {
}
