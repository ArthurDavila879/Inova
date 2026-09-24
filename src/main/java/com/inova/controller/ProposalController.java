package com.inova.controller;

import com.inova.dto.proposal.*;
import com.inova.service.ProposalService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping({"/proposals", "/api/v1/proposals"})
public class ProposalController {
    private final ProposalService service;

    public ProposalController(ProposalService s) {
        service = s;
    }

    @GetMapping
    public List<ProposalResponse> list(@RequestParam(required = false) String status, Authentication a) {
        return service.list(status, id(a));
    }

    @GetMapping("/ranking")
    public List<ProposalResponse> ranking(Authentication a) {
        return service.ranking(id(a));
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody ProposalRequest r, Authentication a) {
        return ResponseEntity.status(201).body(java.util.Map.of("id", service.create(r, id(a))));
    }

    private Long id(Authentication a) {
        return a == null ? null : Long.valueOf(a.getName());
    }

    @GetMapping("/{id}")
    public ProposalResponse get(@PathVariable Long id, Authentication a) {
        return service.get(id, id(a));
    }

    @PutMapping("/{id}")
    public ProposalResponse update(@PathVariable Long id, @Valid @RequestBody ProposalUpdateRequest r, Authentication a) {
        return service.update(id, id(a), r);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication a) {
        service.delete(id, id(a));
        return ResponseEntity.noContent().build();
    }
}
