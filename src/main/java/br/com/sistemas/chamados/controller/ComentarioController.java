package br.com.sistemas.chamados.controller;

import br.com.sistemas.chamados.dto.ComentarioRequest;
import br.com.sistemas.chamados.dto.ComentarioResponse;
import br.com.sistemas.chamados.service.ComentarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;


@RestController
@RequestMapping("/comentarios")
class ComentarioController {

    private final ComentarioService service;

    public ComentarioController(ComentarioService comentarioService) {
        this.service = comentarioService;
    }

    @PostMapping
    public ResponseEntity<ComentarioResponse> criar
            (@Valid @RequestBody ComentarioRequest dto) {
        ComentarioResponse criado = service.criar(dto);
        return ResponseEntity.created(URI.create("/comentarios/" + criado.id())).body(criado);
    }

    @GetMapping("")
    public List<ComentarioResponse> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    public ComentarioResponse buscar(@PathVariable Long id) {
        return service.buscar(id);
    }

    @PutMapping("/{id}")
    public ComentarioResponse atualizar(
            @PathVariable Long id,
            @Valid @RequestBody ComentarioRequest dto) {
        return service.atualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }
}