package br.com.sistemas.chamados.repository;

import br.com.sistemas.chamados.entity.Comentario;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComentarioRepository extends JpaRepository<Comentario, Long> {

}
