package com.inova.repository;

import com.inova.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface VoteRepository extends JpaRepository<Vote, Long> {
    @org.springframework.data.jpa.repository.Query("select count(v) from Vote v where v.user.id=:uid and v.proposal.author.id<>:uid")
    long participationVotes(Long uid);
    Optional<Vote> findByUserIdAndProposalId(Long userId, Long proposalId);

    long countByProposalIdAndDirection(Long proposalId, VoteDirection direction);
    void deleteByProposalId(Long proposalId);
    interface Score {
        Long getProposalId();
        Long getTotal();
    }

    @org.springframework.data.jpa.repository.Query("select v.proposal.id as proposalId, sum(case when v.direction = com.inova.entity.VoteDirection.UP then 1 else -1 end) as total from Vote v where v.proposal.id in :ids group by v.proposal.id")
    List<Score> scores(@org.springframework.data.repository.query.Param("ids") Collection<Long> ids);
    List<Vote> findByUserIdAndProposalIdIn(Long userId, Collection<Long> ids);
}
