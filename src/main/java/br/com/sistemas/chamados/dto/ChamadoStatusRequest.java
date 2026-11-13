package br.com.sistemas.chamados.dto;

import br.com.sistemas.chamados.enuns.StatusChamado;
import jakarta.validation.constraints.NotNull;

public record ChamadoStatusRequest(

        @NotNull(message = "Status é obrigatório")
        StatusChamado status) {
}
