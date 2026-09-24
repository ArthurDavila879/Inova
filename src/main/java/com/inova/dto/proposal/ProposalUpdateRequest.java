package com.inova.dto.proposal;
import jakarta.validation.constraints.*;

public record ProposalUpdateRequest(@NotBlank @Size(max=255) String title,
    @NotBlank @Size(max=5000) String desc, @NotBlank @Size(max=255) String bairro,
    @Size(max=255) String address,
    @DecimalMin("-90") @DecimalMax("90") Double latitude,
    @DecimalMin("-180") @DecimalMax("180") Double longitude) {
    @AssertTrue(message="Informe latitude e longitude juntas")
    public boolean isCoordinatePairValid() { return (latitude == null) == (longitude == null); }
}
