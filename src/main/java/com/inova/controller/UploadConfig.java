package com.inova.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;
import java.nio.file.Path;

@Configuration
public class UploadConfig implements WebMvcConfigurer {
    @Value("${app.upload-dir:./uploads}") private String directory;
    @Override public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
            .addResourceLocations(Path.of(directory).toAbsolutePath().normalize().toUri().toString() + "/");
    }
}
