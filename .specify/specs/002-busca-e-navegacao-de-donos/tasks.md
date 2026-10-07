# Tarefas, Busca e navegação de donos

> Ordem de dependência. `[P]` marca tarefas que podem rodar em paralelo por tocarem
> arquivos diferentes.
>
> A coluna *satisfaz* aponta o critério de aceite do `spec.md`. Os identificadores
> `UT-nnn-n` são os testes que os cards do backlog já traziam, preservados como tarefa de
> teste própria.

- [x] **T001** Preparar a operação de busca de dono por começo de sobrenome
      *entrega:* a consulta que filtra pelo começo do sobrenome e devolve, por dono, contato
      e os nomes dos animais
      *satisfaz:* CA-1.1
      *depende de:* a feature 001 ter o Dono modelado e migrado

- [x] **T002** [P] Implementar a normalização do termo de busca
      *entrega:* espaços das pontas removidos, e termo vazio ou só de espaços traduzido para
      um filtro que casa com todo sobrenome, em vez de um filtro por sobrenome igual a vazio
      *satisfaz:* CA-1.2, CA-1.3
      *depende de:* T001

- [ ] **T003** [P] Implementar o retorno ao formulário com erro de campo quando a busca não
      encontra nenhum dono
      *entrega:* busca sem resultado devolvendo o próprio formulário com erro no campo de
      sobrenome, com o texto vindo do catálogo de traduções, e nenhuma listagem de zero
      linhas montada em momento algum
      *satisfaz:* CA-1.4
      *depende de:* T001

- [x] **T004** Normalizar a caixa na aplicação e criar o índice sobre a forma normalizada do
      sobrenome
      *entrega:* o filtro entregue ao repositório já normalizado, de modo que o resultado não
      dependa de qual banco responde, mais a migração que cria o índice sobre a forma
      normalizada na mesma tarefa
      *satisfaz:* CA-4.1
      *depende de:* T002

- [x] **T005** Implementar a guarda de faixa de página, com piso explícito de uma página no
      total
      *entrega:* página menor que um, maior que o total, negativa ou não numérica levando à
      primeira página do mesmo resultado, sem falha e sem expor a causa; base vazia
      respondendo a primeira página vazia e não produzindo desvio novo
      *satisfaz:* CA-2.2, CA-2.3
      *depende de:* T001

- [ ] **T006** Fazer o termo procurado acompanhar o endereço de cada link de navegação da
      listagem
      *entrega:* todo link de página da listagem carregando o sobrenome procurado, de forma
      que avançar de página não desfaça o filtro. **É a correção do defeito BUG-UI-01 do
      legado, e ela mora na página, não na operação**
      *satisfaz:* CA-2.1
      *depende de:* T005

- [x] **T007** Teste de navegação entre páginas de um resultado filtrado, percorrendo os links
      da página
      *entrega:* um teste que busca um sobrenome com mais de uma página, **clica no link da
      página seguinte** e verifica que a listagem continua filtrada. O teste falha se a
      correção for feita só no lado do controlador
      *satisfaz:* CA-2.1
      *depende de:* T006

- [x] **T008** [P] Ler o tamanho da página da configuração
      *entrega:* o tamanho de página vindo de configuração, com valor padrão declarado, e
      nenhum valor de tamanho fixo no código da operação
      *satisfaz:* CA-2.4
      *depende de:* T005

- [ ] **T009** [P] Implementar o atalho de resultado único
      *entrega:* busca com exatamente um resultado apresentando a ficha daquele dono sem
      montar listagem; com dois ou mais, a listagem; e a ficha alcançada pelo atalho sem
      nenhuma mensagem de confirmação de gravação
      *satisfaz:* CA-3.1, CA-3.2, CA-3.3
      *depende de:* T001, e a ficha do dono da feature 001

- [x] **T010** Limitar o recorte da consulta no banco, em vez de ler tudo e cortar depois
      *entrega:* o pedido ao repositório limitando as linhas ao tamanho da página, verificável
      com uma base de quinhentos donos
      *satisfaz:* — (é a parte verificável de US-5; os dois critérios dela dependem de números
      que não existem, ver `Sem tarefa`)
      *depende de:* T008

- [x] **T011** Testes da busca
      *entrega:* `UT-008-1` a `UT-008-8` passando, incluindo o dono que **não** é encontrado
      quando o termo casa com nome, cidade ou telefone, o termo vazio tratado como casamento
      com todo sobrenome, a volta ao formulário em vez de lista vazia e nenhuma gravação em
      nenhum dos caminhos
      *satisfaz:* CA-1.1, CA-1.2, CA-1.3, CA-1.4, CA-1.5
      *depende de:* T003, T004

- [x] **T012** Testes de paginação e de guarda de faixa
      *entrega:* `UT-009-1` a `UT-009-7` e `UT-012-1` passando, incluindo a página zero e a
      página acima do total, a página negativa e a não numérica, a base vazia sem laço de
      redirecionamento, o tamanho lido da configuração, o sexto dono na segunda página e o
      sobrenome preservado no desvio
      *satisfaz:* CA-2.1, CA-2.2, CA-2.3, CA-2.4
      *depende de:* T008, T010

- [ ] **T013** [P] Testes do atalho de resultado único
      *entrega:* `UT-010-1` a `UT-010-4` passando, inclusive o caso que distingue um
      resultado de nenhum: um vai à ficha, nenhum volta ao formulário com erro
      *satisfaz:* CA-3.1, CA-3.2, CA-3.3
      *depende de:* T009

- [x] **T014** [P] Testes de insensibilidade à caixa
      *entrega:* `UT-011-1` e `UT-011-2` passando. `UT-011-2` verifica o **filtro entregue ao
      repositório**, não o resultado, para que o teste falhe mesmo rodando contra um banco que
      já ignoraria a caixa por conta própria
      *satisfaz:* CA-4.1
      *depende de:* T004

- [x] **T015** Teste de comportamento da busca contra o PostgreSQL real
      *entrega:* a busca por sobrenome ignorando caixa, verificada contra o banco em contêiner
      e não contra um banco em memória. P-05: o PostgreSQL é o único banco homologado
      *satisfaz:* CA-4.2
      *depende de:* T004, T014

- [ ] **T016** Gerador de massa sintética e teste de desempenho da listagem
      *entrega:* um gerador de 50 mil donos sintéticos (nunca dado real) e um teste em
      `npm run verify:perf` que mede o p95 da busca e da listagem e falha acima de 500 ms
      (D08)
      *satisfaz:* CA-5.1, CA-5.2
      *depende de:* T010

## Sem tarefa

Nenhum critério ficou sem tarefa. CA-4.2 ganhou alvo em P-05, e CA-5.1 e CA-5.2 ganharam
número em D08.
