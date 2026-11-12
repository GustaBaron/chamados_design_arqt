# Projeto-Chamados-1-DAS1
<!-- TOC -->
* [Chamados Design Arquitetura](#chamados_design_arqt)
  * [Endpoints](#endpoints)
  * [JSON](#json)
<!-- TOC -->


## Endpoints
- ### Clientes
  - Criar Clientes: `POST /clientes`
  - Listar Clientes: `GET /clientes`
  - Listar Chamados do Cliente: `GET /clientes/{id}/chamados`
  - Listar Cliente por ID: `GET clientes/{id}`
  - Atualizar Clientes: `PUT clientes/{id}`
  - Deletar Clientes: `DELETE clientes/{id}`
- ### Categoria
  - Criar Categorias: `POST /categorias`
  - Listar Categorias: `GET /categorias`
  - Listar Categoria por ID: `GET categorias/{id}`
  - Atualizar Categoria: `PUT categorias/{id}`
  - Deletar Categoria: `DELETE categorias/{id}`
- ### Tecnico
  - Criar Tecnicos: `POST /tecnicos`
  - Listar Tecnicos: `GET /tecnicos`
  - Listar Tecnico por ID: `GET tecnicos/{id}`
  - Atualizar Tecnico: `PUT tecnicos/{id}`
  - Deletar Tecnico: `DELETE tecnicos/{id}`
- ### Chamado
  - Criar Chamados: `POST /chamados`
  - Listar Chamado por ID: `GET chamados/{id}`
  - Atualizar Chamado: `PUT chamados/{id}`
  - Deletar Chamado: `DELETE chamados/{id}`
  - Fechar Chamado: `PUT chamados/fechar/{id}`
  - Atualizar Status do Chamado: `PATCH chamados/{id}/status`
  - Atribuir Técnico ao Chamado: `PATCH chamados/{id}/atribuir`
  - Listar Chamados: `GET /chamados`
    - Filtros do Listar: `GET /chamados?status=&clienteId=&prioridade=`
- ### Comentario
  - Criar Comentarios: `POST /comentarios`
  - Listar Comentarios: `GET /comentarios`
  - Listar Comentario por ID: `GET comentarios/{id}`
  - Atualizar Comentario: `PUT comentarios/{id}`
  - Deletar Comentario: `DELETE comentarios/{id}`

## JSON
- ### Clientes
    ```json
    { 
        "nome": "",
        "email": "",
        "telefone": ""
    }
    ```
- ### Categorias
    ```json
    {
        "nome": "",
        "descricao": ""
    }
    ```
- ### Tecnicos
  - Tipos de Perfil: ADMIN, TECNICO
      ```json
      {
          "nome": "",
          "email": "",
          "perfil": ""
      }
      ```
- ### Chamados
  - Tipos de Prioridade: BAIXA,MEDIA,ALTA,CRITICA
      ```json
      {
        "titulo": "",
        "descricao": "",
        "prioridade": "",
        "clienteId": 0,
        "categoriaId": 0
      }
      ```
  - Atribuir Técnico
      ```json
      {
        "tecnicoId": 0
      }
      ```
  - Alterar Status
    - Tipos de Status: ABERTO, EM_ANDAMENTO, AGUARDANDO_CLIENTE
    ```json
    {
      "status": ""
    }
    ```
- ### Comentarios
    ```json
    {
      "texto": "",
      "autor": "",
      "chamadoId": 0
    }
    ```
