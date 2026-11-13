package br.com.sistemas.chamados.service;

import br.com.sistemas.chamados.dto.ChamadoAtribuirRequest;
import br.com.sistemas.chamados.dto.ChamadoRequest;
import br.com.sistemas.chamados.dto.ChamadoResponse;
import br.com.sistemas.chamados.dto.ChamadoStatusRequest;
import br.com.sistemas.chamados.entity.Categoria;
import br.com.sistemas.chamados.entity.Chamado;
import br.com.sistemas.chamados.entity.Cliente;
import br.com.sistemas.chamados.enuns.Prioridade;
import br.com.sistemas.chamados.enuns.StatusChamado;
import br.com.sistemas.chamados.exception.RecursoNaoEncontradoException;
import br.com.sistemas.chamados.exception.RegraNegocioException;
import br.com.sistemas.chamados.repository.ChamadoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ChamadoService {

    private final ChamadoRepository repository;
    private final TecnicoService tecnicoService;
    private final CategoriaService categoriaService;
    private final ClienteService clienteService;

    ChamadoService(ChamadoRepository repository, TecnicoService tecnicoService, CategoriaService categoriaService, ClienteService clienteService) {
        this.repository = repository;
        this.tecnicoService = tecnicoService;
        this.categoriaService = categoriaService;
        this.clienteService = clienteService;
    }

    @Transactional
    public ChamadoResponse criar(ChamadoRequest dto) {

        Cliente cliente = clienteService.buscarEntity(dto.clienteId());
        Categoria categoria = categoriaService.buscarEntity(dto.categoriaId());

        Chamado salvo = repository.save(new Chamado(
                dto.titulo(),
                dto.descricao(),
                dto.prioridade(),
                cliente,
                categoria
        ));
        return ChamadoResponse.de(salvo);
    }

    @Transactional(readOnly = true)
    public Page<ChamadoResponse> listar(StatusChamado status, Prioridade prioridade, Long clienteId, Pageable pageable) {
        return repository.filtrar(status, prioridade, clienteId, pageable)
                .map(ChamadoResponse::de);
    }
    @Transactional(readOnly = true)
    public Page<ChamadoResponse> listarPorCliente(Long clienteId, Pageable pageable) {
        clienteService.buscarEntity(clienteId);
        return repository.findByCliente_Id(clienteId, pageable)
                .map(ChamadoResponse::de);
    }

    @Transactional(readOnly = true)
    public ChamadoResponse buscar(Long id) {
        return ChamadoResponse.de(buscarEntity(id));
    }

    @Transactional
    public ChamadoResponse atualizar(Long id, ChamadoRequest dto) {
        Chamado chamado = buscarEntity(id);
        chamado.setTitulo(dto.titulo());
        chamado.setDescricao(dto.descricao());
        chamado.setPrioridade(dto.prioridade());
        chamado.setCliente(clienteService.buscarEntity(dto.clienteId()));
        chamado.setCategoria(categoriaService.buscarEntity(dto.categoriaId()));
        return ChamadoResponse.de(chamado);
    }

    @Transactional
    public ChamadoResponse atribuirTecnico(Long id, ChamadoAtribuirRequest dto) {
        Chamado chamado = buscarEntity(id);
        if (chamado.getStatus() == StatusChamado.FECHADO) {
            throw new RegraNegocioException("Não é possível atribuir um Técnico a um chamado Fechado");
        }
        chamado.setTecnico(tecnicoService.buscarEntity(dto.tecnicoId()));
        return ChamadoResponse.de(chamado);
    }

    @Transactional
    public ChamadoResponse alterarStatus(Long id, ChamadoStatusRequest dto) {
        if (dto.status().equals(StatusChamado.FECHADO)) {
            throw new RegraNegocioException("Não é permitido alterar o status para Fechado");
        }
        Chamado chamado = buscarEntity(id);
        chamado.setStatus(dto.status());
        return ChamadoResponse.de(chamado);
    }

    @Transactional
    public ChamadoResponse fechar(Long id) {
        Chamado chamado = buscarEntity(id);
        chamado.setDataFechamento(LocalDateTime.now());
        chamado.setStatus(StatusChamado.FECHADO);
        return ChamadoResponse.de(chamado);
    }

    @Transactional
    public void excluir(Long id) {
        repository.delete(buscarEntity(id));
    }

    public Chamado buscarEntity(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Chamado " + id + " não encontrado"));
    }
}
