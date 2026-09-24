package com.inova.dto.vote;

import com.inova.entity.VoteDirection;
import jakarta.validation.constraints.NotNull;

public record VoteRequest(@NotNull VoteDirection direction) {
}
