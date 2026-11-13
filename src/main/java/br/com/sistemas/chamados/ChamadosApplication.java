package br.com.sistemas.chamados;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@SpringBootApplication
@Controller
public class ChamadosApplication {

	@GetMapping("/")
	public String paginaInicial() {
		return "index";
	}

	public static void main(String[] args) {
		SpringApplication.run(ChamadosApplication.class, args);
	}

}
