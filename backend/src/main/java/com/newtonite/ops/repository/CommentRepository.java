package com.newtonite.ops.repository;

import com.newtonite.ops.model.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @Query("SELECT c FROM Comment c JOIN FETCH c.author WHERE c.workItem.id = :workItemId ORDER BY c.createdAt ASC")
    List<Comment> findByWorkItemIdWithAuthor(@Param("workItemId") Long workItemId);

    @Query(value = "SELECT c FROM Comment c JOIN FETCH c.author WHERE c.workItem.id = :workItemId",
           countQuery = "SELECT count(c) FROM Comment c WHERE c.workItem.id = :workItemId")
    Page<Comment> findByWorkItemIdWithAuthorPaged(@Param("workItemId") Long workItemId, Pageable pageable);
}
