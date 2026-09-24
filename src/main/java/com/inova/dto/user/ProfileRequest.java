package com.inova.dto.user;
import jakarta.validation.constraints.*;

public record ProfileRequest(@NotBlank @Size(max=255) String name,
    @NotBlank @Email @Size(max=255) String email,
    @NotBlank @Size(max=255) String bairro, @NotBlank @Size(max=255) String cidade) {}
