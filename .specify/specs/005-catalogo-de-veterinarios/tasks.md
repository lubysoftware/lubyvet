# Tarefas, Catálogo de veterinários

> Ordem de dependência. `[P]` marca tarefas que podem rodar em paralelo por tocarem
> arquivos diferentes.
>
> A coluna *satisfaz* aponta o critério de aceite do `spec.md`. Tarefa sem critério é
> infraestrutura, e está dito nela. Os identificadores `UT-nnn-n` são os testes que os
> cards do backlog já traziam, preservados como tarefa de teste própria.

- [x] **T001** Declarar o nome de toda coluna do Veterinário, da Especialidade e do vínculo
      entre as duas, sem depender de estratégia automática de nomenclatura
      *entrega:* o mapeamento das duas entidades e da tabela de vínculo com nome de coluna
      explícito em cada campo, mais o teste que compara declaração e migração
      *satisfaz:* — (infraestrutura exigida pelo princípio P3 da constituição e pela decisão
      da Pergunta 14)

- [x] **T002** Modelar o Veterinário e a Especialidade, com nome e sobrenome obrigatórios e o
      nome da especialidade obrigatório e único
      *entrega:* as duas entidades com os limites de tamanho declarados nos dois lados, a
      coleção de especialidades podendo ser vazia, e as validações de nome e sobrenome do
      veterinário **exercitáveis sem formulário**, ao contrário do legado, onde existiam e
      nunca eram exercitadas
      *satisfaz:* CA-1.1
      *depende de:* T001

- [x] **T003** Criar a migração versionada com as três tabelas e a restrição de unicidade
      **nomeada** do par veterinário e especialidade
      *entrega:* uma migração numerada, aplicável do zero, com a unicidade do par declarada
      com nome próprio e com as chaves estrangeiras também nomeadas; nenhum arquivo de criação
      de esquema fora do diretório de migrações. É a arbitragem da contradição C4, decidida na
      Pergunta 6
      *satisfaz:* — (infraestrutura exigida pelo princípio P5)
      *depende de:* T002

- [x] **T004** Escrever o teste que prova que o par veterinário e especialidade repetido é
      recusado pelo banco
      *entrega:* um teste que grava o mesmo par duas vezes e espera recusa. No legado o
      dialeto padrão aceitava **e a aplicação escondia a duplicata**, porque a coleção não
      comparava por valor: o teste existe para que a invisibilidade não volte
      *satisfaz:* — (infraestrutura, arbitragem de C4)
      *depende de:* T003

- [x] **T005** Implementar a montagem do catálogo de tela
      *entrega:* cada linha com nome, sobrenome e as especialidades daquele veterinário em
      ordem alfabética, a marca de ausência vinda do catálogo de traduções quando não há
      nenhuma, a ordenação feita a cada leitura sem depender da ordem vinda do repositório, e
      **nenhuma gravação solicitada**, nem quando a página pedida não existe
      *satisfaz:* CA-1.1, CA-1.2, CA-1.3, CA-1.4
      *depende de:* T003

- [x] **T006** Implementar a paginação com ordenação explícita no pedido e a guarda de faixa
      *entrega:* o tamanho de página configurado, a ordenação explícita viajando no **pedido
      ao repositório** e não aplicada depois em memória, a página fora da faixa levando à
      primeira, e o piso de uma página preservado com comentário de decisão. Remover esse piso
      cria laço infinito de redirecionamento com o catálogo vazio, e ele é o conteúdo do único
      commit do repositório legado
      *satisfaz:* CA-2.1, CA-2.2, CA-2.3
      *depende de:* T005

- [x] **T007** Testes do catálogo de tela
      *entrega:* `UT-023-1` a `UT-023-7` passando, cobrindo as três linhas com nome, sobrenome
      e especialidades, as especialidades fora de ordem saindo alfabéticas, a marca de ausência
      em vez de coluna em branco, nenhuma gravação nas duas páginas pedidas, nome e sobrenome
      exigidos e nada além deles, os três veterinários com zero, uma e três especialidades, e
      duas leituras do mesmo veterinário com ordens diferentes produzindo saídas iguais
      *satisfaz:* CA-1.1, CA-1.2, CA-1.3, CA-1.4
      *depende de:* T005

- [x] **T008** [P] Testes da paginação do catálogo
      *entrega:* `UT-024-1` a `UT-024-4` passando, incluindo os onze veterinários distribuídos
      em três páginas sem repetição nem omissão, a mesma página pedida duas vezes devolvendo
      respostas idênticas, a página zero e a página sete levando à página um, o catálogo vazio
      **sem desvio em laço**, e os cinco na primeira página com o sexto na segunda
      *satisfaz:* CA-2.1, CA-2.2, CA-2.3
      *depende de:* T006

- [x] **T009** Implementar a memória do catálogo com descarte a cada escrita no quadro
      *entrega:* a leitura servida de memória, e o descarte provocado por **cada** escrita no
      quadro de veterinários, de modo que a leitura seguinte vá à fonte. É a correção de
      REG-39, que registra memória sem prazo e sem invalidação
      *satisfaz:* CA-3.1
      *depende de:* T005

- [x] **T010** Testes da atualidade do catálogo
      *entrega:* `UT-025-1`, `UT-025-2` e `UT-025-3` passando, incluindo o veterinário
      recém-incluído aparecendo na leitura seguinte sem reinício, cada escrita provocando um
      descarte, e a enumeração das operações da superfície de leitura sem nenhuma que grave.
      O caminho de escrita usado aqui é **de teste**: a tela de manutenção do quadro é o card
      REQ-046, da feature 009, e está bloqueada por decisão humana sobre papéis. O critério é
      verificável sem ela
      *satisfaz:* CA-3.1, CA-3.2
      *depende de:* T009

- [ ] **T011** ~~Resposta de dados do catálogo~~ **removida por D22**: não existe rota de
      dados para sistema externo; o front é servido por T012

- [x] **T012** Servir o catálogo ao front num formato só, sem estado de persistência
      *entrega:* `GET /api/vets` com o schema de saída declarado em `packages/contracts`
      (D32), paginado por P-06, e o pedido de outro formato (`Accept` diferente de JSON)
      recusado com 406 em vez de resposta malformada; nenhuma resposta serializa estado de
      persistência
      *satisfaz:* CA-5.1, CA-5.2, CA-6.1, CA-6.2
      *depende de:* T005

- [x] **T013** Testes da proibição
      *entrega:* o pedido de outro formato recusado com 406, e um teste que percorre todos os
      schemas de saída de `packages/contracts` e falha se algum tiver campo de persistência
      (P9)
      *satisfaz:* CA-5.1, CA-5.2, CA-6.1, CA-6.2
      *depende de:* T012

- [x] **T014** Prazo de validade de segurança da memória do catálogo
      *entrega:* TTL de 10 minutos no Redis além da invalidação por escrita (P-08);
      `UT-025-4` passando com relógio controlado
      *satisfaz:* CA-3.1
      *depende de:* T009

## Sem tarefa

US-4 inteira (CA-4.1 a CA-4.3) saiu do escopo por D22 e não faz parte do pronto. Nenhum
outro critério ficou sem tarefa.
