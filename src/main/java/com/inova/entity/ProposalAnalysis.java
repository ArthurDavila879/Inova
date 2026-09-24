package com.inova.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "proposal_analysis")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProposalAnalysis {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "proposal_id", nullable = false, unique = true)
  private Proposal proposal;
  @Column(name = "estimated_cost", length = 100)
  private String estimatedCost;
  @Column(name = "trees_required")
  private Integer treesRequired;
  @Column(name = "temperature_reduction", length = 100)
  private String temperatureReduction;
  @Column(name = "implementation_time", length = 100)
  private String implementationTime;
  @Column(length = 500)
  private String species;
  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @PrePersist
  void create() {
    createdAt = LocalDateTime.now();
  }
}
