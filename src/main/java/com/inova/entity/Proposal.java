package com.inova.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "proposals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Proposal {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(nullable = false, length = 255)
  private String title;
  @Column(name = "description", nullable = false, columnDefinition = "TEXT")
  private String description;
  @Column(length = 255)
  private String bairro;
  @Column(length = 100)
  private String tipo;
  @Column(length = 255)
  private String location;
  @Column(length = 50)
  private String status;
  @Column(length = 50)
  private String emoji;
  @Column(length = 500)
  private String photo;
  private Double latitude;
  private Double longitude;
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "author_id", nullable = false)
  private User author;
  @ManyToMany
  @JoinTable(name = "proposal_tags", joinColumns = @JoinColumn(name = "proposal_id"), inverseJoinColumns = @JoinColumn(name = "tag_id"))
  @Builder.Default
  private Set<Tag> tags = new HashSet<>();
  @OneToOne(mappedBy = "proposal", cascade = CascadeType.ALL, orphanRemoval = true)
  private ProposalAnalysis analysis;
  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @PrePersist
  void create() {
    createdAt = LocalDateTime.now();
    updatedAt = createdAt;
  }

  @PreUpdate
  void update() {
    updatedAt = LocalDateTime.now();
  }
}
