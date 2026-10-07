# Tarefas, Operação, erros e observabilidade

> Ordem de dependência. `[P]` marca tarefas que podem rodar em paralelo por tocarem
> arquivos diferentes.
>
> A coluna *satisfaz* aponta o critério de aceite do `spec.md`. Tarefa sem critério é
> infraestrutura, e está dito nela. Os identificadores `UT-nnn-n` são os testes que os
> cards do backlog já traziam, preservados como tarefa de teste própria.
>
> Três dos vinte e sete critérios desta feature **não têm tarefa**, por conflito entre uma
> decisão humana e um card. Ver a seção `Sem tarefa` no fim.

- [x] **T001** Declarar, em arquivo do projeto, a lista dos caminhos que recebem identificador
      de dono ou de animal
      *entrega:* a lista, derivada dos 17 pares de método e rota que `permissions.md` enumera, e
      que T004 percorre. É a mesma técnica de inventário de T001 da feature 007, com outro
      recorte
      *satisfaz:* — (infraestrutura, pré-requisito de CA-1.4)

- [x] **T002** Escolher e configurar a biblioteca de log, e declarar para onde o log vai
      *entrega:* a configuração de log do projeto, com nível por ambiente. No legado **não
      existia nenhuma**: zero arquivo de log, zero configuração e zero ocorrências de
      registrador em todo o código de produção, com três linhas de configuração das quais duas
      comentadas
      *satisfaz:* — (infraestrutura, pré-requisito de CA-2.3, CA-4.4, CA-5.1, CA-5.2 e CA-5.3)

- [x] **T003** Implementar a resolução de identificador inexistente, com **uma** busca por
      requisição
      *entrega:* a resolução que devolve "não encontrado" com página amigável, sem rastro de
      pilha, nome de classe nem texto de consulta, e que consulta o repositório **uma vez só**:
      no legado o mesmo identificador era carregado duas vezes, uma na resolução do vínculo e
      outra no caminho de tratamento
      *satisfaz:* CA-1.1, CA-1.2, CA-1.3
      *depende de:* T001

- [x] **T004** Escrever o teste de identificador inexistente a partir da **lista** de caminhos
      *entrega:* `UT-037-1` a `UT-037-5` passando, incluindo a ficha, a edição e o agendamento
      respondendo "não encontrado", a resposta sem rastro de pilha nem texto de consulta, a
      contagem de buscas igual a um, e o percurso da lista de T001, de modo que um caminho novo
      acrescentado à lista nasça coberto
      *satisfaz:* CA-1.4
      *depende de:* T003

- [x] **T005** Implementar a página de erro com identificador de ocorrência gerado **uma vez**
      *entrega:* a página com mensagem compreensível e o identificador da ocorrência, sem rastro
      de pilha, versão de biblioteca, caminho de arquivo nem nome de classe, e o **mesmo**
      identificador entregue ao usuário e escrito no log, a partir de um gerador injetável. Erro
      de domínio e erro técnico chegam à mesma resposta, cada um com identificador distinto
      *satisfaz:* CA-2.1, CA-2.2, CA-2.3
      *depende de:* T002

- [x] **T006** Implementar o log de aplicação, sem dado pessoal e sem credencial
      *entrega:* o registro de toda falha inesperada com momento, caminho pedido e identificador
      da ocorrência; o registro de cada escrita de dono, animal e visita com momento e
      resultado, bem-sucedido ou recusado; e o dono aparecendo **por identificador, nunca por
      nome**, com credencial mascarada
      *satisfaz:* CA-5.1, CA-5.2, CA-5.3
      *depende de:* T002, T005

- [x] **T007** Testes da página de erro
      *entrega:* `UT-038-1` a `UT-038-5` passando, incluindo a mensagem e o identificador, a
      ausência dos quatro elementos proibidos, o identificador igual no log e na resposta, as
      três causas de falha diferentes passando pela mesma conferência, e o erro de domínio e o
      técnico chegando à mesma resposta com identificadores distintos
      *satisfaz:* CA-2.1, CA-2.2, CA-2.3, CA-2.4
      *depende de:* T006

- [x] **T008** Implementar as sondas de vivacidade e de prontidão
      *entrega:* a vivacidade respondendo conforme a aplicação consiga ou não atender; a
      prontidão respondendo positivamente **só** quando as dependências necessárias, inclusive o
      banco, estão acessíveis; e as duas respondendo sem identificação e **apenas o estado
      agregado**, de modo que um verificador que falhe com mensagem detalhada não faça a resposta
      carregar nome de dependência, endereço, credencial ou causa
      *satisfaz:* CA-3.1, CA-3.2, CA-3.3

- [x] **T009** Declarar as duas sondas no manifesto de publicação, com os tempos de espera
      *entrega:* os dois caminhos declarados no manifesto com os tempos definidos. A dívida
      DT-19 registra que o manifesto do legado também não trazia limites de recurso, sonda de
      inicialização nem transporte seguro: nenhum card pede os três, e eles ficam como
      observação no `plan.md`, não como entrega desta tarefa
      *satisfaz:* CA-3.4
      *depende de:* T008

- [x] **T010** Declarar o inventário dos caminhos de gestão, com a ausência de classificação
      significando **protegido**
      *entrega:* a lista dos caminhos de gestão expostos, classificados, e a regra de que um
      caminho novo sem classificação é tratado como protegido, para que esquecer de classificar
      erre para o lado seguro. **Esta tarefa não abre nem fecha nada**, e por isso existe apesar
      do conflito de US-4: ela é útil nos dois cenários e não decide qual deles vale
      *satisfaz:* — (infraestrutura, e insumo do que CA-4.1, CA-4.2 e CA-4.3 precisarão quando
      forem arbitrados)
      *depende de:* T008

- [x] **T011** Mascarar valor de credencial em resposta, em log e em saída de console
      *entrega:* nas três saídas o valor aparece mascarado **e a chave que o nomeia continua
      legível**, porque esconder a chave também impede o diagnóstico. A lacuna G12 registra o
      caso mais direto do legado: um utilitário de teste imprimia a senha do banco sem máscara
      no caminho principal
      *satisfaz:* CA-4.4
      *depende de:* T002

- [x] **T012** [P] Testes das sondas
      *entrega:* `UT-039-1` a `UT-039-3` passando, incluindo a vivacidade positiva e negativa
      nos dois estados, a prontidão negativa com o banco inacessível, e as duas respondendo sem
      identificação e sem carregar nome de dependência, endereço, credencial ou causa
      *satisfaz:* CA-3.1, CA-3.2, CA-3.3
      *depende de:* T008

- [x] **T013** [P] Testes do log e da máscara de credencial
      *entrega:* `UT-041-1` a `UT-041-3` e `UT-040-4` passando, incluindo momento, caminho e
      identificador em toda falha, as seis escritas registradas com resultado, nenhum valor de
      nome, endereço ou telefone no log, e o valor de credencial mascarado nas três saídas com a
      chave legível
      *satisfaz:* CA-4.4, CA-5.1, CA-5.2, CA-5.3
      *depende de:* T006, T011

- [x] **T014** Garantir que nenhum caminho provoca falha deliberada
      *entrega:* nenhum caminho do sistema lançando falha de propósito, nenhum item de menu
      levando a erro, e o comportamento da página de erro verificado **por teste** em vez de por
      rota exposta ao usuário. É a troca explícita que o card de descarte REQ-042 propõe: a
      demonstração vira teste, e T007 é esse teste
      *satisfaz:* CA-6.1, CA-6.2, CA-6.3
      *depende de:* T007

- [x] **T015** [P] Garantir que nenhum console de banco de dados é servido, em perfil algum
      *entrega:* nenhum caminho servindo console de banco em nenhum perfil, e **nenhuma
      dependência que o habilite presente no artefato publicável**, incluindo as transitivas. No
      legado o console só existia com as ferramentas de desenvolvimento no caminho de classes,
      que são opcionais e ficam fora do artefato publicado: nem o próprio legado o levava a
      produção
      *satisfaz:* CA-7.1, CA-7.2

- [x] **T016** Converger para um único conjunto de definição de esquema, por migração versionada
      *entrega:* um conjunto só, no dialeto eleito, com a evolução acontecendo por migração
      numerada, aplicada do zero e **verificada em teste**, e nenhum arquivo de criação de
      esquema fora do diretório de migrações. É a maior economia estrutural do backlog: no
      legado eram três conjuntos paralelos, mantidos à mão, sem ferramenta de migração.
      *pré-requisito que não é desta tarefa:* **qual** é o dialeto eleito é decisão humana, item
      5 do Não negociável da constituição e decisão de stack número 2 do `plan.md`
      *satisfaz:* CA-8.1, CA-8.2

- [x] **T017** Escrever o teste de que nenhuma regra de negócio depende do dialeto do banco
      *entrega:* um teste que percorre as quatro divergências de comportamento que o legado
      tinha, a busca sensível à caixa, a mensagem de nome de animal duplicado, o limite de
      tamanho de nome e a unicidade do par veterinário e especialidade, e prova que cada uma tem
      **uma só** definição, de modo que nenhuma mude conforme o banco. As quatro são a origem de
      quatro das cinco contradições encontradas, e as correções moram nas features 002, 003 e
      005: este teste é o que amarra as três
      *satisfaz:* CA-8.3
      *depende de:* T016

- [x] **T018** Proteger a superfície de gestão, deixando abertas só as sondas
      *entrega:* `liveness` e `readiness` sem credencial, com o estado agregado; todo outro
      caminho do inventário de T010 exige o papel Administrador (D03, D18). Os manifestos do
      Kubernetes apontam as sondas só para os dois caminhos abertos. `UT-040-1` e `UT-040-2`
      passando
      *satisfaz:* CA-4.1, CA-4.2
      *depende de:* T010, e a identidade da feature 007

- [x] **T019** Teste de recusa anônima de cada caminho de gestão
      *entrega:* um teste que percorre o inventário de T010 e pede cada caminho sem credencial
      e com o papel Escrita, esperando recusa, exceto nas duas sondas. `UT-040-3` passando
      *satisfaz:* CA-4.3
      *depende de:* T018

- [x] **T020** Credenciais fora do repositório
      *entrega:* `Secret`s do Kubernetes consumidos por nome pelo chart (P-13, D36); `.env.example`
      só com os nomes; uma verificação em `npm run verify` que falha se encontrar valor de
      credencial versionado
      *satisfaz:* — (item 8 do Não negociável)
      *depende de:* —

- [x] **T021** Métricas de uso
      *entrega:* as métricas de D27 publicadas a partir de eventos de domínio, por uma porta
      `Metricas` com adaptador OpenTelemetry; um teste que dispara cada evento e confere a
      métrica e os rótulos, e falha se algum rótulo carregar nome, CPF, celular ou e-mail; e
      um painel inicial no Grafana versionado como JSON no repositório
      *satisfaz:* CA-5.4
      *depende de:* T020, e os eventos das features 001, 003, 004 e 007

- [x] **T022** Helm chart do LubyVet
      *entrega:* um chart que implanta web, api, worker, o `CronJob` do D-1 (D29), o cluster
      CloudNativePG, o Redis, o RabbitMQ (pelo operador oficial) e as rotas de Gateway API com
      TLS; `values.yaml` sem nenhum valor secreto; imagens fixadas por digest; recursos, sondas
      (T009) e `startupProbe` declarados; instalação testada em kind na CI. A verificação dos
      pré-requisitos do cluster falha a instalação com mensagem clara
      *satisfaz:* — (D36; fecha DT-16 e DT-19 do legado)
      *depende de:* T009, T020

- [ ] **T023** Backup do PostgreSQL e ensaio de restauração automatizado
      *entrega:* backup contínuo e base diária para bucket S3-compatível fora do cluster;
      um teste na CI que sobe o cluster em kind, grava dados, restaura para um ponto no
      tempo num cluster novo e confere que os dados voltaram. Sem esse teste verde, a
      feature 008 não fecha
      *satisfaz:* — (D36, D24)
      *depende de:* T022

## Sem tarefa

Nenhum critério ficou sem tarefa. US-4 foi arbitrada em D03. Os indicadores de uso foram
decididos em D27 e são entregues por T021.
