package com.inova.repository;

import com.inova.entity.ProposalAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ProposalAnalysisRepository extends JpaRepository<ProposalAnalysis, Long> {
    Optional<ProposalAnalysis> findByProposalId(Long proposalId);
}
