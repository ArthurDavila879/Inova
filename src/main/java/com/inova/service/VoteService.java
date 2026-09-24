package com.inova.service;

import com.inova.dto.vote.VoteRequest;
import com.inova.entity.*;
import com.inova.exception.ResourceNotFoundException;
import com.inova.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VoteService {
    private final VoteRepository votes;
    private final UserRepository users;
    private final ProposalRepository proposals;

    public VoteService(VoteRepository v, UserRepository u, ProposalRepository p) {
        votes = v;
        users = u;
        proposals = p;
    }

    @Transactional
    public void remove(Long uid, Long pid) {
        if (!proposals.existsById(pid)) throw new ResourceNotFoundException("Proposta não encontrada");
        votes.findByUserIdAndProposalId(uid, pid).ifPresent(votes::delete);
    }

    @Transactional
    public String vote(Long uid, Long pid, VoteRequest r) {
        User u = users.findById(uid).orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        Proposal p = proposals.findById(pid)
                .orElseThrow(() -> new ResourceNotFoundException("Proposta não encontrada"));
        var existing = votes.findByUserIdAndProposalId(uid, pid);
        if (existing.isPresent()) {
            Vote v = existing.get();
            if (v.getDirection() == r.direction()) {
                votes.delete(v);
                return "Vote removed";
            }
            v.setDirection(r.direction());
            votes.save(v);
            return "Vote updated";
        }
        votes.save(Vote.builder().user(u).proposal(p).direction(r.direction()).build());
        return "Vote recorded";
    }
}
