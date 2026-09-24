package com.inova.service;

import com.inova.dto.proposal.*;
import com.inova.entity.*;
import com.inova.exception.ResourceNotFoundException;
import com.inova.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class ProposalService {
    private final ProposalRepository proposals;
    private final UserRepository users;
    private final VoteRepository votes;
    private final TagRepository tags;
    private final ProposalAnalysisRepository analyses;
    private final PhotoService photos;

    public ProposalService(ProposalRepository p, UserRepository u, VoteRepository v, TagRepository t,
            ProposalAnalysisRepository a, PhotoService photos) {
        proposals = p;
        users = u;
        votes = v;
        tags = t;
        analyses = a;
        this.photos = photos;
    }

    private ProposalResponse map(Proposal p, Long uid) {
        long up = votes.countByProposalIdAndDirection(p.getId(), VoteDirection.UP),
                down = votes.countByProposalIdAndDirection(p.getId(), VoteDirection.DOWN);
        Vote v = uid == null ? null : votes.findByUserIdAndProposalId(uid, p.getId()).orElse(null);
        return ProposalResponse.from(p, up - down, v);
    }

    private List<ProposalResponse> mapAll(List<Proposal> ps, Long uid) {
        if (ps.isEmpty()) return List.of();
        var ids = ps.stream().map(Proposal::getId).toList();
        Map<Long, Long> totals = new HashMap<>();
        votes.scores(ids).forEach(s -> totals.put(s.getProposalId(), s.getTotal()));
        Map<Long, Vote> mine = new HashMap<>();
        if (uid != null) votes.findByUserIdAndProposalIdIn(uid, ids).forEach(v -> mine.put(v.getProposal().getId(), v));
        return ps.stream().map(p -> ProposalResponse.from(p, totals.getOrDefault(p.getId(), 0L), mine.get(p.getId()))).toList();
    }

    @Transactional(readOnly = true)
    public List<ProposalResponse> list(String status, Long uid) {
        List<Proposal> ps = (status == null || status.isBlank() || status.equalsIgnoreCase("all"))
                ? proposals.findAllWithTagsOrderByIdDesc()
                : proposals.findByStatusWithTags(status);
        return mapAll(ps, uid);
    }

    @Transactional(readOnly = true)
    public List<ProposalResponse> ranking(Long uid) {
        return mapAll(proposals.findAllWithTagsOrderByIdDesc(), uid).stream()
                .sorted(Comparator.comparingLong(ProposalResponse::votes).reversed()
                    .thenComparing(ProposalResponse::id, Comparator.reverseOrder())).toList();
    }

    @Transactional(readOnly = true)
    public ProposalResponse get(Long id, Long uid) {
        return map(find(id), uid);
    }

    private Proposal find(Long id) {
        return proposals.findById(id).orElseThrow(() -> new ResourceNotFoundException("Proposta não encontrada"));
    }

    private void requireOwner(Proposal p, Long uid) {
        if (!p.getAuthor().getId().equals(uid))
            throw new org.springframework.security.access.AccessDeniedException("Apenas o autor pode alterar a proposta");
    }

    @Transactional
    public ProposalResponse update(Long id, Long uid, ProposalUpdateRequest r) {
        Proposal p = find(id);
        requireOwner(p, uid);
        p.setTitle(r.title());
        p.setDescription(r.desc());
        p.setBairro(r.bairro());
        if (r.address() != null) p.setLocation(r.address().isBlank() ? r.bairro() + " - " + p.getAuthor().getCidade() : r.address());
        if (r.latitude() != null) { p.setLatitude(r.latitude()); p.setLongitude(r.longitude()); }
        return map(p, uid);
    }

    @Transactional
    public void delete(Long id, Long uid) {
        Proposal p = find(id);
        requireOwner(p, uid);
        votes.deleteByProposalId(id);
        proposals.delete(p);
    }

    @Transactional
    public Long create(ProposalRequest r, Long uid) {
        User u = users.findById(uid).orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        String emoji = switch (r.tipo().toLowerCase()) {
            case "calcada" -> "🌳";
            case "praca" -> "🌿";
            case "escola" -> "🏫";
            case "via" -> "🌲";
            case "rio" -> "🏞️";
            default -> "🌱";
        };
        Proposal p = Proposal.builder().title(r.title()).description(r.desc()).bairro(r.bairro()).tipo(r.tipo())
                .location(r.address() == null || r.address().isBlank() ? r.bairro() + " - " + u.getCidade() : r.address())
                .status("votacao").author(u).emoji(emoji).photo(photos.save(r.photo()))
                .latitude(r.latitude()).longitude(r.longitude()).build();
        String[] tagNames = { r.tipo(), "Nova proposta" };
        for (String n : tagNames) {
            Tag t = tags.findByName(n).orElseGet(() -> tags.save(Tag.builder().name(n).build()));
            p.getTags().add(t);
        }
        Map<String, Object[]> data = new HashMap<>();
        data.put("calcada", new Object[] { "R$ 13.000", 12, "2,5°C", "18 meses", "Ipê-amarelo" });
        data.put("praca", new Object[] { "R$ 35.000", 25, "4,0°C", "36 meses", "Jequitibá" });
        data.put("escola", new Object[] { "R$ 9.500", 8, "2,0°C", "12 meses", "Nim indiano" });
        data.put("via", new Object[] { "R$ 22.000", 18, "3,0°C", "24 meses", "Paineira" });
        data.put("rio", new Object[] { "R$ 80.000", 70, "5,0°C", "48 meses", "Embaúba" });
        Object[] d = data.getOrDefault(r.tipo().toLowerCase(), data.get("calcada"));
        Proposal saved = proposals.save(p);
        ProposalAnalysis a = ProposalAnalysis.builder().proposal(saved).estimatedCost((String) d[0])
                .treesRequired((Integer) d[1]).temperatureReduction((String) d[2]).implementationTime((String) d[3])
                .species((String) d[4]).build();
        analyses.save(a);
        saved.setAnalysis(a);
        votes.save(Vote.builder().user(u).proposal(saved).direction(VoteDirection.UP).build());
        return saved.getId();
    }
}
