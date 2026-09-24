package com.inova.service;

import com.inova.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@Transactional(readOnly=true)
public class StatisticsService {
    private final ProposalRepository proposals;
    private final VoteRepository votes;
    public StatisticsService(ProposalRepository proposals, VoteRepository votes) {
        this.proposals=proposals; this.votes=votes;
    }
    public record Statistics(long proposals, long votes, long mappedProposals, long estimatedTrees, long leaderScore) {}
    public record Achievement(String code, String name, String description, long progress, long target, boolean unlocked) {}
    public record Activity(long proposals, long votes, long estimatedTrees, List<Achievement> achievements) {}

    public Statistics global() {
        return new Statistics(proposals.count(), votes.count(), proposals.countByLatitudeIsNotNull(), proposals.estimatedTrees(), Math.max(0,proposals.leaderScore()));
    }
    public Activity activity(Long uid) {
        long created=proposals.countByAuthorId(uid), participation=votes.participationVotes(uid), support=proposals.mostSupportsByAuthor(uid);
        return new Activity(created, participation, proposals.estimatedTreesByAuthor(uid), List.of(
            achievement("first_vote", "Primeiro voto", "Mantenha um voto em proposta de outra pessoa", participation, 1),
            achievement("defender", "Defensor verde", "Vote em 5 propostas de outras pessoas", participation, 5),
            achievement("proposer", "Semeador", "Publique sua primeira proposta", created, 1),
            achievement("influencer", "Mobilizador", "Receba 100 apoios de outras pessoas em uma proposta", support, 100)
        ));
    }
    private Achievement achievement(String code, String name, String description, long progress, long target) {
        return new Achievement(code,name,description,progress,target,progress>=target);
    }
}
