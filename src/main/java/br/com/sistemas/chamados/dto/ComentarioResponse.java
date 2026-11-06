package br.com.sistemas.chamados.dto;

import br.com.sistemas.chamados.entity.Comentario;

import java.time.LocalDateTime;

public record ComentarioResponse(
        Long id,
        String texto,
        String autor,
        LocalDateTime dataCriacao,
        Long chamadoId,
        String chamadoTitulo
) {
    public static ComentarioResponse de(Comentario c) {
        return new ComentarioResponse(
                c.getId(),
                c.getTexto(),
                c.getAutor(),
                c.getData(),
                c.getChamado().getId(), c.getChamado().getTitulo()
        );
    }
}
