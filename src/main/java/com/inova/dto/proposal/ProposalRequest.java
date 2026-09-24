package com.inova.dto.proposal;

import jakarta.validation.constraints.*;

public record ProposalRequest(@NotBlank @Size(max = 255) String title, @NotBlank @Size(max = 5000) String desc,
        @NotBlank @Size(max = 255) String bairro,
        @NotBlank @Pattern(regexp = "calcada|praca|escola|via|rio") String tipo,
        @Size(max = 7000000) String photo, @Size(max = 255) String address,
        @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @DecimalMin("-180") @DecimalMax("180") Double longitude) {
    @AssertTrue(message="Informe latitude e longitude juntas")
    public boolean isCoordinatePairValid() { return (latitude == null) == (longitude == null); }
}
