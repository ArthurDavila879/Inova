package com.inova.controller;

import com.inova.service.StatisticsService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
public class StatisticsController {
    private final StatisticsService service;
    public StatisticsController(StatisticsService service) { this.service=service; }
    @GetMapping({"/stats", "/api/v1/stats"})
    public StatisticsService.Statistics global() { return service.global(); }
    @GetMapping("/api/v1/users/me/activity")
    public StatisticsService.Activity activity(Authentication a) { return service.activity(Long.valueOf(a.getName())); }
}
