package br.com.sistemas.chamados.dto;

import br.com.sistemas.chamados.enuns.Prioridade;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ChamadoRequest(

        @NotBlank(message = "Título é obrigatório")
        @Size(max = 100, message = "Título deve ter no máximo 100 caracteres")
        String titulo,

        @NotBlank(message = "Descrição é obrigatório")
        @Size(max = 1000, message = "Descrição deve ter no máximo 1000 caracteres")
        String descricao,

        @NotNull(message = "Prioridade é obrigatório")
        Prioridade prioridade,

        @NotNull(message = "Cliente é obrigatório")
        Long clienteId,

        @NotNull(message = "Categoria é obrigatório")
        Long categoriaId

) {
}
