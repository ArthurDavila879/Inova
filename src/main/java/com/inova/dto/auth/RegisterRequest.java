package com.inova.dto.auth;

import jakarta.validation.constraints.*;

public record RegisterRequest(@NotBlank @Size(max = 255) String name, @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 6, max = 100) String password) {
}
