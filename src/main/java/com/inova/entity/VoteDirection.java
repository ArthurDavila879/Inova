package com.inova.entity;

public enum VoteDirection {
    UP, DOWN;

    @com.fasterxml.jackson.annotation.JsonCreator
    public static VoteDirection parse(String value) {
        return valueOf(value.toUpperCase(java.util.Locale.ROOT));
    }
}
