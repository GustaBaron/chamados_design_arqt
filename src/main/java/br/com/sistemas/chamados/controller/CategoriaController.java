package br.com.sistemas.chamados.controller;

import br.com.sistemas.chamados.dto.CategoriaRequest;
import br.com.sistemas.chamados.dto.CategoriaResponse;
import br.com.sistemas.chamados.service.CategoriaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/categorias")
public class CategoriaController {

    private final CategoriaService service;

    public CategoriaController(CategoriaService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<CategoriaResponse> criar(
            @Valid @RequestBody CategoriaRequest dto) {
        CategoriaResponse criado = service.criar(dto);
        return ResponseEntity.created(URI.create("/categorias/" + criado.id())).body(criado);
    }

    @GetMapping
    public List<CategoriaResponse> listar () {
        return service.listar();
    }

    @GetMapping("/{id}")
    public CategoriaResponse buscar (@PathVariable Long id) {
        return service.buscar(id);
    }

    @PutMapping("/{id}")
    public CategoriaResponse atualizar (
            @PathVariable Long id,
            @Valid @RequestBody CategoriaRequest dto) {
        return service.atualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar (@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
