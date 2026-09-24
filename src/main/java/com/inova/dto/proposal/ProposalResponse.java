package com.inova.dto.proposal;

import com.inova.dto.user.UserResponse;
import com.inova.entity.*;
import java.time.LocalDateTime;
import java.util.*;

public record ProposalResponse(Long id, String title, String desc, String location, String bairro, Set<String> tags,
        long votes, String userVote, String status, Author author, ProposalAnalysisData ia, String emoji,
        LocalDateTime createdAt, String photo, Double latitude, Double longitude) {
    public record Author(Long id, String name, String initials) {
    }

    public record ProposalAnalysisData(String estimatedCost, Integer treesRequired, String temperatureReduction,
            String implementationTime, String species) {
    }

    public static ProposalResponse from(Proposal p, long votes, Vote vote) {
        Set<String> tags = new HashSet<>();
        if (p.getTags() != null)
            p.getTags().forEach(t -> tags.add(t.getName()));
        var a = p.getAnalysis();
        var ia = a == null ? new ProposalAnalysisData(null, null, null, null, null)
                : new ProposalAnalysisData(a.getEstimatedCost(), a.getTreesRequired(), a.getTemperatureReduction(),
                        a.getImplementationTime(), a.getSpecies());
        return new ProposalResponse(p.getId(), p.getTitle(), p.getDescription(), p.getLocation(), p.getBairro(), tags,
                votes, vote == null ? null : vote.getDirection().name().toLowerCase(), p.getStatus(),
                new Author(p.getAuthor().getId(), p.getAuthor().getName(), UserResponse.from(p.getAuthor()).initials()), ia, p.getEmoji(),
                p.getCreatedAt(), p.getPhoto(), p.getLatitude(), p.getLongitude());
    }
}
