package br.com.sistemas.chamados.controller;

import br.com.sistemas.chamados.dto.ChamadoResponse;
import br.com.sistemas.chamados.dto.ClienteRequest;
import br.com.sistemas.chamados.dto.ClienteResponse;
import br.com.sistemas.chamados.service.ChamadoService;
import br.com.sistemas.chamados.service.ClienteService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/clientes")
public class ClienteController {

    private final ClienteService service;
    private final ChamadoService chamado;

    public ClienteController(ClienteService service , ChamadoService chamado) {
        this.service = service;
        this.chamado = chamado;
    }

    @PostMapping
    public ResponseEntity<ClienteResponse> criar (
            @Valid @RequestBody ClienteRequest dto) {
        ClienteResponse criado = service.criar(dto);
        return ResponseEntity.created(URI.create("/clientes/" + criado.id())).body(criado);
    }

    @GetMapping
    public List<ClienteResponse> listar () {
        return service.listar();
    }

    @GetMapping("/{id}/chamados")
    public Page<ChamadoResponse> listarChamados(
            @PathVariable Long id,
            @PageableDefault(sort = "dataCriacao", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return chamado.listarPorCliente(id, pageable);
    }

    @GetMapping("/{id}")
    public ClienteResponse buscar (@PathVariable Long id) {
        return service.buscar(id);
    }

    @PutMapping("/{id}")
    public ClienteResponse atualizar (
            @PathVariable Long id,
            @Valid @RequestBody ClienteRequest dto) {
        return service.atualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir (@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }

}
