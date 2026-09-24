package com.inova.service;

import com.inova.dto.user.*;
import com.inova.entity.User;
import com.inova.exception.ResourceNotFoundException;
import com.inova.repository.UserRepository;
import com.inova.security.JwtService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    private final UserRepository users;
    private final JwtService jwt;

    public UserService(UserRepository users, JwtService jwt) {
        this.users = users;
        this.jwt = jwt;
    }

    @Transactional
    public com.inova.dto.auth.AuthResponse updateLocation(Long id, LocationRequest r) {
        User u = users.findById(id).orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        u.setBairro(r.bairro());
        u.setCidade(r.cidade());
        users.save(u);
        return new com.inova.dto.auth.AuthResponse(jwt.generate(u.getId()), UserResponse.from(u));
    }

    public UserResponse me(Long id) {
        return UserResponse
                .from(users.findById(id).orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado")));
    }

    @Transactional
    public com.inova.dto.auth.AuthResponse updateProfile(Long id, ProfileRequest r) {
        User u = users.findById(id).orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        String email = r.email().trim().toLowerCase(java.util.Locale.ROOT);
        if (users.existsByEmailIgnoreCaseAndIdNot(email, id))
            throw new com.inova.exception.BusinessException("Email já cadastrado");
        u.setName(r.name().trim());
        u.setEmail(email);
        u.setBairro(r.bairro().trim());
        u.setCidade(r.cidade().trim());
        users.saveAndFlush(u);
        return new com.inova.dto.auth.AuthResponse(jwt.generate(id), UserResponse.from(u));
    }
}
