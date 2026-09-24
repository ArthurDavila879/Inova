package com.inova.repository;

import com.inova.entity.Proposal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface ProposalRepository extends JpaRepository<Proposal, Long> {
    long countByAuthorId(Long uid);
    long countByLatitudeIsNotNull();
    @Query("select coalesce(sum(a.treesRequired),0) from ProposalAnalysis a")
    long estimatedTrees();
    @Query("select coalesce(sum(a.treesRequired),0) from ProposalAnalysis a where a.proposal.author.id=:uid")
    long estimatedTreesByAuthor(Long uid);
    @Query(value="select coalesce(max(s.total),0) from (select sum(case when direction='UP' then 1 else -1 end) total from votes group by proposal_id) s", nativeQuery=true)
    long leaderScore();
    @Query(value="select coalesce(max(s.total),0) from (select count(*) total from votes v join proposals p on p.id=v.proposal_id where p.author_id=:uid and v.user_id<>:uid and v.direction='UP' group by p.id) s", nativeQuery=true)
    long mostSupportsByAuthor(Long uid);
    @Query("select distinct p from Proposal p join fetch p.author left join fetch p.analysis left join fetch p.tags order by p.id desc")
    List<Proposal> findAllWithTagsOrderByIdDesc();

    @Query("select distinct p from Proposal p join fetch p.author left join fetch p.analysis left join fetch p.tags where p.status=:status order by p.id desc")
    List<Proposal> findByStatusWithTags(String status);
}
