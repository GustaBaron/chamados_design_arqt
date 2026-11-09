package br.com.sistemas.chamados.service;

import br.com.sistemas.chamados.dto.ComentarioRequest;
import br.com.sistemas.chamados.dto.ComentarioResponse;
import br.com.sistemas.chamados.entity.Chamado;
import br.com.sistemas.chamados.entity.Comentario;
import br.com.sistemas.chamados.exception.RecursoNaoEncontradoException;
import br.com.sistemas.chamados.repository.ComentarioRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ComentarioService {

    private ComentarioRepository repository;
    private ChamadoService chamadoService;

    public ComentarioService(ComentarioRepository repository, ChamadoService chamadoService) {
        this.repository = repository;
        this.chamadoService = chamadoService;
    }

    @Transactional
    public ComentarioResponse criar(ComentarioRequest dto) {

        Chamado chamado = chamadoService.buscarEntity(dto.chamadoId());

        Comentario salvo = repository.save(new Comentario(
                dto.texto(),
                dto.autor(),
                chamado
        ));
        return ComentarioResponse.de(salvo);
    }

    @Transactional(readOnly = true)
    public List<ComentarioResponse> listar() {
        return repository.findAll().stream().map(ComentarioResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public ComentarioResponse buscar(Long id) {
        return ComentarioResponse.de(buscarEntity(id));
    }

    @Transactional
    public ComentarioResponse atualizar(Long id, ComentarioRequest dto) {
        Comentario comentario = buscarEntity(id);
        comentario.setTexto(dto.texto());
        comentario.setAutor(dto.autor());
        return ComentarioResponse.de(comentario);
    }

    @Transactional
    public void excluir(Long id) {
        repository.delete(buscarEntity(id));
    }

    public Comentario buscarEntity(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Comentario " + id + " não encontrado"));
    }
}
