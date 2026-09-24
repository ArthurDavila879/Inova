package com.inova.security;

import com.inova.repository.UserRepository;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository repo;

    public CustomUserDetailsService(UserRepository repo) {
        this.repo = repo;
    }

    public UserDetails loadUserByUsername(String username) {
        return repo.findById(Long.valueOf(username))
                .map(u -> User.withUsername(u.getId().toString()).password(u.getPassword()).roles("USER").build())
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado"));
    }
}
