package br.com.sistemas.chamados.dto;

import br.com.sistemas.chamados.entity.Categoria;

public record CategoriaResponse(
        Long id,
        String titulo,
        String descricao
)

{
    public static CategoriaResponse de(Categoria c) {
        return new CategoriaResponse(c.getId(), c.getNome(), c.getDescricao());
    }
}
