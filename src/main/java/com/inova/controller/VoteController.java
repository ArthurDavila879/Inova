package com.inova.controller;

import com.inova.dto.vote.VoteRequest;
import com.inova.service.VoteService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping({"/proposals", "/api/v1/proposals"})
public class VoteController {
    private final VoteService votes;

    public VoteController(VoteService v) {
        votes = v;
    }

    @PostMapping({"/{id}/vote", "/{id}/votes"})
    public Map<String, String> vote(@PathVariable Long id, @Valid @RequestBody VoteRequest r, Authentication a) {
        return Map.of("message", votes.vote(Long.valueOf(a.getName()), id, r));
    }

    @DeleteMapping("/{id}/votes")
    public Map<String, String> remove(@PathVariable Long id, Authentication a) {
        votes.remove(Long.valueOf(a.getName()), id);
        return Map.of("message", "Vote removed");
    }
}
