package com.inova.dto.user;

import jakarta.validation.constraints.NotBlank;

public record LocationRequest(@NotBlank @jakarta.validation.constraints.Size(max = 255) String bairro,
        @NotBlank @jakarta.validation.constraints.Size(max = 255) String cidade) {
}
