package br.com.sistemas.chamados.dto;

import br.com.sistemas.chamados.entity.Chamado;
import br.com.sistemas.chamados.entity.Comentario;
import br.com.sistemas.chamados.entity.Tecnico;
import br.com.sistemas.chamados.enuns.Prioridade;
import br.com.sistemas.chamados.enuns.StatusChamado;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

public record ChamadoResponse(
        Long id,
        String titulo,
        String descricao,
        LocalDateTime dataCriacao,
        LocalDateTime dataFechamento,
        Prioridade prioridade,
        StatusChamado status,
        Long tecnicoId,
        String tecnicoNome,
        Long clienteId,
        String clienteNome,
        Long categoriaId,
        String categoriaNome,
        List<ComentarioResponse> comentarios
) {
    public static ChamadoResponse de(Chamado c) {
        Tecnico t = c.getTecnico();
        List<ComentarioResponse> comentarios = c.getComentarios().stream()
                .sorted(Comparator.comparing(Comentario::getData))
                .map(ComentarioResponse::de)
                .toList();

        return new ChamadoResponse(
                c.getId(), c.getTitulo(), c.getDescricao(),
                c.getDataCriacao(), c.getDataFechamento(),
                c.getPrioridade(), c.getStatus(),
                t != null ? t.getId() : null, t != null ? t.getNome() : null,
                c.getCliente().getId(), c.getCliente().getNome(),
                c.getCategoria().getId(), c.getCategoria().getNome(),
                comentarios
        );
    }
}
