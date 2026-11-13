package br.com.sistemas.chamados.repository;

import br.com.sistemas.chamados.entity.Chamado;
import br.com.sistemas.chamados.enuns.Prioridade;
import br.com.sistemas.chamados.enuns.StatusChamado;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChamadoRepository extends JpaRepository<Chamado, Long> {

    @EntityGraph(attributePaths = {"cliente", "categoria", "tecnico"})

    boolean existsByStatus(StatusChamado status);

    @Query("""
        SELECT c from Chamado c
        WHERE (:status is null or c.status = :status)
          and (:prioridade is null or c.prioridade = :prioridade)
          and (:clienteId is null or c.cliente.id = :clienteId)
        """)
    Page<Chamado> filtrar(
            @Param("status") StatusChamado status,
            @Param("prioridade") Prioridade prioridade,
            @Param("clienteId") Long clienteId,
            Pageable pageable
    );

    Page<Chamado> findByCliente_Id(Long clienteId, Pageable pageable);
}
