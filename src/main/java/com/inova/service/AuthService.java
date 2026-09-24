package com.inova.service;

import com.inova.dto.auth.*;
import com.inova.dto.user.UserResponse;
import com.inova.entity.User;
import com.inova.exception.BusinessException;
import com.inova.repository.UserRepository;
import com.inova.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    public AuthResponse register(RegisterRequest r) {
        if (r.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
            throw new BusinessException("Senha deve ter no máximo 72 bytes em UTF-8");
        if (users.existsByEmail(r.email()))
            throw new BusinessException("Email já cadastrado");
        User u = User.builder().name(r.name()).email(r.email()).password(encoder.encode(r.password()))
                .bairro("Serra Centro").cidade("Serra, ES").build();
        users.save(u);
        return new AuthResponse(jwt.generate(u.getId()), UserResponse.from(u));
    }

    public AuthResponse login(LoginRequest r) {
        User u = users.findByEmail(r.email()).orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        if (!encoder.matches(r.password(), u.getPassword()))
            throw new BusinessException("Senha incorreta");
        return new AuthResponse(jwt.generate(u.getId()), UserResponse.from(u));
    }
}
