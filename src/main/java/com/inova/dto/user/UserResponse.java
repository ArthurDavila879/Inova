package com.inova.dto.user;

import com.inova.entity.User;

public record UserResponse(Long id, String name, String email, String initials, String bairro, String cidade) {
    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getName(), u.getEmail(), initials(u.getName()), u.getBairro(),
                u.getCidade());
    }

    private static String initials(String n) {
        return n == null || n.isBlank() ? "U" : n.substring(0, 1).toUpperCase();
    }
}
