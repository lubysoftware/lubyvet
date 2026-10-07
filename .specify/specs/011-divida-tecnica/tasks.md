# Tarefas, Dívida técnica da primeira entrega

> Ordem de dependência. `[P]` marca tarefas que podem rodar em paralelo por tocarem
> arquivos diferentes. A coluna *satisfaz* aponta o critério de aceite do `spec.md`.
> Regra desta feature: cada tarefa termina com `bun run verify` verde **sem mudar o que os
> testes de aceitação de 001 a 010 verificam** (plan.md, "Como não quebrar nada").

## US-4 Testar comportamento, não texto de código

- [x] **T001** Listar as verificações estruturais permitidas num só lugar
      *entrega:* uma lista em `traceability.acceptance-spec.ts` dos arquivos que um teste de
      aceitação pode ler (git ls-files, manifesto do Helm, `package.json`, inventário de rotas,
      catálogos de tradução, migrações) e um teste que falha quando um teste de aceitação lê
      arquivo fora dela
      *satisfaz:* CA-4.2
      *depende de:* —

- [x] **T002** Trocar por testes de tela os critérios provados lendo o código do web
      *entrega:* 001/CA-7.3, 002/CA-1.4, 002/CA-3.1, 002/CA-3.3, 004/CA-1.4, 008/CA-6.2 e 008/CA-6.3
      provados no Playwright (`3-acceptance.e2e.ts`), e as leituras de `apps/web/src` (fora dos
      catálogos de tradução) removidas da suíte da API
      *satisfaz:* CA-4.1, CA-4.3
      *depende de:* T001

- [x] **T003** [P] Trocar por teste de comportamento os critérios provados lendo o código da API
      *entrega:* 001/CA-1.6 (o tradutor de unicidade não lê mensagem), 001/CA-2.3, 002/CA-5.2,
      003/CA-2.4, 005/CA-5.2 e 008/CA-8.3 provados por comportamento ou movidos para a lista
      estrutural com o motivo escrito. 007/CA-2.1 (rotas dos controllers contra a matriz de
      papéis) é inventário de rotas e fica na lista estrutural
      *satisfaz:* CA-4.1
      *depende de:* T001

## US-2 Deixar os controllers finos

- [x] **T004** Criar o caso de uso `ListVetPatients`
      *entrega:* o caso de uso decide "não encontrado" e devolve os animais; o controller só
      chama e serializa. 004/CA-4.4 e 008/CA-1.4 continuam verdes
      *satisfaz:* CA-2.1
      *depende de:* —

- [x] **T005** [P] Separar a anonimização num controller próprio
      *entrega:* `AnonymizationController` com anonimizar, listar e confirmar texto livre; as
      rotas e a matriz de papéis não mudam (P9)
      *satisfaz:* CA-2.2
      *depende de:* —

- [x] **T006** Regra de fronteira: interface não importa porta
      *entrega:* regra nova no `.dependency-cruiser.cjs` proibindo `interface/` de importar
      `application/ports/`. Hoje sete arquivos fazem isso e passam a chamar caso de uso:
      `session.controller.ts` e `auth.guard.ts` (sessão e usuário), `health.controller.ts` e
      `admin-ops.controller.ts` (leitor de operação), `owners.controller.ts` (autoria),
      `pets.controller.ts` (catálogo de espécies) e `vets.controller.ts` (pacientes, já em T004)
      *satisfaz:* CA-2.3
      *depende de:* T004, T005

## US-1 Dar domínio próprio à identidade

- [x] **T007** Modelar a conta de acesso no domínio
      *entrega:* `modules/identity/domain/account.ts` com a tentativa de login (aceita, recusada,
      bloqueada até) e o desbloqueio pelo tempo (P-15), com teste de unidade sem infraestrutura
      cobrindo a quinta tentativa, a sexta e o fim do bloqueio
      *satisfaz:* CA-1.1
      *depende de:* —

- [x] **T008** Reduzir o caso de uso de login a orquestração
      *entrega:* `Login` lê o usuário pela porta, pede a decisão à conta e grava o resultado;
      os testes de 007 continuam verdes
      *satisfaz:* CA-1.2
      *depende de:* T007

- [x] **T009** [P] Registrar por que `operations` e `vocabularies` não têm domínio
      *entrega:* parágrafo em `docs/padroes/arquitetura.md`: leitura agregada e manutenção de
      cadastro sem regra própria; quando surgir regra, nasce o `domain/`
      *satisfaz:* CA-1.3
      *depende de:* —

## US-3 Métricas a partir de eventos de domínio

- [ ] **T010** Porta de eventos de domínio e adaptador em processo
      *entrega:* `shared/domain/events.ts` com os eventos de D27 tipados (sem dado pessoal no
      evento: só ids e o tipo) e o adaptador que entrega aos assinantes no mesmo processo
      *satisfaz:* — (infraestrutura, pré-requisito de CA-3.1 e CA-3.2)
      *depende de:* a resposta à pergunta "Barramento de eventos" da spec

- [ ] **T011** Publicar eventos nos casos de uso, depois da gravação
      *entrega:* os sete casos de uso que hoje chamam `metrics.increment` passam a publicar o
      evento só depois de a gravação dar certo; teste de unidade de que recusa e conflito não
      publicam
      *satisfaz:* CA-3.1, CA-3.3
      *depende de:* T010, T004

- [ ] **T012** Assinante único de métricas
      *entrega:* `MetricsSubscriber` traduz evento em contador e é o único chamador da porta de
      métricas; 008/CA-5.4 continua verde com os mesmos nomes e rótulos
      *satisfaz:* CA-3.2, CA-3.4
      *depende de:* T011

## US-5 Alinhar o front ao padrão escrito

- [ ] **T013** Decidir formulário e componentes
      *entrega:* as duas perguntas em aberto da spec respondidas em `memory/decisoes.md` (D45 e
      D46), depois de tentar `bunx shadcn add` nesta máquina
      *satisfaz:* — (decisão, pré-requisito de CA-5.1 e CA-5.2)
      *depende de:* —

- [ ] **T014** Formulários pela decisão
      *entrega:* os formulários de dono, animal, agendamento, atendimento, login e
      administração na forma decidida em T013, com `docs/padroes/frontend.md` atualizado; os
      testes de componente continuam provando os mesmos critérios
      *satisfaz:* CA-5.1, CA-5.4
      *depende de:* T013

- [ ] **T015** [P] Peças de interface pela decisão
      *entrega:* botão, diálogo, selo e campo vindos do shadcn/ui e ajustados aos tokens, ou a
      decisão de mantê-los registrada; o axe nos dois temas continua verde
      *satisfaz:* CA-5.2, CA-5.4
      *depende de:* T013

- [ ] **T016** [P] Estado na URL por `nuqs`
      *entrega:* busca de donos, página do catálogo, aba da administração e animal escolhido na
      ficha lidos e escritos por `nuqs`; nenhuma tela monta query string à mão
      *satisfaz:* CA-5.3, CA-5.4
      *depende de:* —
