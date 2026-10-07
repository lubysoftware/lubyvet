> O pacote já está neste projeto: as especificações em `.specify/specs/`, os limites em `memory/constitution.md`. Não há nada para copiar, e todo caminho citado abaixo é deste projeto.

# Pacote de especificações: spring-petclinic

Especificações de um sistema **novo**, derivadas da engenharia reversa de spring-petclinic. Nenhum arquivo do sistema analisado é alterado por este pacote.

| | |
|---|---|
| features | 11 (001–010 entregues; 011 é dívida técnica planejada) |
| histórias | 54 |
| critérios de aceite | 176 (3 fora do escopo por D22) |
| tarefas | 188 (16 em aberto, da 011) |
| cards que entraram | 49 de 49 |
| princípios da constituição | 9 |
| stack | **decidida**: Portas e adaptadores · Next.js + shadcn/ui → NestJS · contrato zod/OpenAPI · PostgreSQL/Prisma · Redis · RabbitMQ · Kubernetes agnóstico de provedor (`memory/decisoes.md` D20, D30–D36) |
| specs geradas em | 2026-10-06T22:40:00Z |
| exportado em | 2026-10-07T11:15:53.163Z |
| decisões humanas | 2026-10-07, em `memory/decisoes.md` (D01–D44, P-01–P-25) |

## Como usar

1. O pacote já está neste projeto: não há nada para copiar. Comece pelo passo 2.
2. Leia `memory/constitution.md` e `memory/decisoes.md` antes de escrever qualquer linha. São os limites que nenhuma implementação pode violar, e é o documento que o agente de codificação relê a cada tarefa.
3. Siga a **ordem de implementação** abaixo. Ela não é a ordem numérica das pastas: é a ordem das dependências entre as features.
4. Em cada feature, nesta ordem: `spec.md` diz o quê e por quê, `plan.md` diz como, e `tasks.md` é o que se executa, um item por vez.
5. Marque o checkbox da tarefa em `tasks.md` ao concluir, e o da feature aqui quando ela fechar. Este arquivo é o lugar de onde se enxerga o todo.

> **Pronto para desenvolvimento.** A stack está decidida e as perguntas que travavam critério foram respondidas em `memory/decisoes.md`, que prevalece sobre qualquer trecho antigo. Leia esse arquivo junto com a constituição. Do pacote, nenhuma pergunta ficou aberta; do tech spec, nada: o provedor virou Kubernetes agnóstico (D36). Ficam duas verificações externas que não bloqueiam o código: o prazo de guarda do prontuário com o jurídico (D24) e a conta Business na Meta para produção (D28).

## Ordem de implementação

_A ordem de dependência coincide com a numérica: dá para seguir as pastas de cima para baixo._

- [ ] **1. Gestão de donos** · `001-gestao-de-donos` · EP-1
      7 histórias · 29 critérios · 22 tarefas
      sem dependência dentro do pacote, pode começar por ela
      [spec](.specify/specs/001-gestao-de-donos/spec.md) · [plan](.specify/specs/001-gestao-de-donos/plan.md) · [tasks](.specify/specs/001-gestao-de-donos/tasks.md)
      <sub>vem de REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007</sub>

- [ ] **2. Busca e navegação de donos** · `002-busca-e-navegacao-de-donos` · EP-2
      5 histórias · 16 critérios · 16 tarefas
      depois de `001`
      [spec](.specify/specs/002-busca-e-navegacao-de-donos/spec.md) · [plan](.specify/specs/002-busca-e-navegacao-de-donos/plan.md) · [tasks](.specify/specs/002-busca-e-navegacao-de-donos/tasks.md)
      <sub>vem de REQ-008, REQ-009, REQ-010, REQ-011, REQ-012</sub>

- [ ] **3. Animais do dono** · `003-animais-do-dono` · EP-3
      5 histórias · 22 critérios · 20 tarefas
      depois de `001`
      [spec](.specify/specs/003-animais-do-dono/spec.md) · [plan](.specify/specs/003-animais-do-dono/plan.md) · [tasks](.specify/specs/003-animais-do-dono/tasks.md)
      <sub>vem de REQ-013, REQ-014, REQ-015, REQ-016, REQ-017</sub>

- [ ] **4. Agenda e atendimento de visitas** · `004-agenda-e-atendimento-de-visitas` · EP-4
      5 histórias · 21 critérios · 27 tarefas
      depois de `003`
      [spec](.specify/specs/004-agenda-e-atendimento-de-visitas/spec.md) · [plan](.specify/specs/004-agenda-e-atendimento-de-visitas/plan.md) · [tasks](.specify/specs/004-agenda-e-atendimento-de-visitas/tasks.md)
      <sub>vem de REQ-018, REQ-019, REQ-020, REQ-021, REQ-022</sub>

- [ ] **5. Catálogo de veterinários** · `005-catalogo-de-veterinarios` · EP-5
      6 histórias · 16 critérios · 13 tarefas
      sem dependência dentro do pacote, pode começar por ela
      [spec](.specify/specs/005-catalogo-de-veterinarios/spec.md) · [plan](.specify/specs/005-catalogo-de-veterinarios/plan.md) · [tasks](.specify/specs/005-catalogo-de-veterinarios/tasks.md)
      <sub>vem de REQ-023, REQ-024, REQ-025, REQ-026, REQ-027, REQ-028</sub>

- [ ] **6. Idioma e comunicação com o usuário** · `006-idioma-e-comunicacao` · EP-6
      4 histórias · 11 critérios · 10 tarefas
      sem dependência dentro do pacote, pode começar por ela
      [spec](.specify/specs/006-idioma-e-comunicacao/spec.md) · [plan](.specify/specs/006-idioma-e-comunicacao/plan.md) · [tasks](.specify/specs/006-idioma-e-comunicacao/tasks.md)
      <sub>vem de REQ-029, REQ-030, REQ-031, REQ-032</sub>

- [ ] **7. Acesso, identidade e dados pessoais** · `007-acesso-identidade-e-dados-pessoais` · EP-7
      4 histórias · 15 critérios · 19 tarefas
      sem dependência dentro do pacote, pode começar por ela
      [spec](.specify/specs/007-acesso-identidade-e-dados-pessoais/spec.md) · [plan](.specify/specs/007-acesso-identidade-e-dados-pessoais/plan.md) · [tasks](.specify/specs/007-acesso-identidade-e-dados-pessoais/tasks.md)
      <sub>vem de REQ-033, REQ-034, REQ-035, REQ-036</sub>

- [ ] **8. Operação, erros e observabilidade** · `008-operacao-erros-e-observabilidade` · EP-8
      8 histórias · 28 critérios · 23 tarefas
      sem dependência dentro do pacote, pode começar por ela
      [spec](.specify/specs/008-operacao-erros-e-observabilidade/spec.md) · [plan](.specify/specs/008-operacao-erros-e-observabilidade/plan.md) · [tasks](.specify/specs/008-operacao-erros-e-observabilidade/tasks.md)
      <sub>vem de REQ-037, REQ-038, REQ-039, REQ-040, REQ-041, REQ-042, REQ-043, REQ-044</sub>

- [ ] **9. Vocabulários do domínio** · `009-vocabularios-do-dominio` · EP-9
      2 histórias · 9 critérios · 10 tarefas
      depois de `005`, `007`
      [spec](.specify/specs/009-vocabularios-do-dominio/spec.md) · [plan](.specify/specs/009-vocabularios-do-dominio/plan.md) · [tasks](.specify/specs/009-vocabularios-do-dominio/tasks.md)
      <sub>vem de REQ-045, REQ-046</sub>

- [ ] **10. Interface e identidade visual** · `010-interface-e-identidade-visual` · EP-10
      3 histórias · 9 critérios · 12 tarefas
      sem dependência dentro do pacote, pode começar por ela
      [spec](.specify/specs/010-interface-e-identidade-visual/spec.md) · [plan](.specify/specs/010-interface-e-identidade-visual/plan.md) · [tasks](.specify/specs/010-interface-e-identidade-visual/tasks.md)
      <sub>vem de REQ-047, REQ-048, REQ-049</sub>

- [ ] **11. Dívida técnica da primeira entrega** · `011-divida-tecnica` · revisão de estrutura
      5 histórias · 18 critérios · 16 tarefas
      depois de `001` a `010`; nenhum comportamento novo, só refatoração presa pelos testes de aceitação
      [spec](.specify/specs/011-divida-tecnica/spec.md) · [plan](.specify/specs/011-divida-tecnica/plan.md) · [tasks](.specify/specs/011-divida-tecnica/tasks.md)
      <sub>vem da revisão de estrutura de 07/10/2026</sub>

## Perguntas em aberto · 0 de 56 (todas respondidas em `memory/decisoes.md`)

O que a análise do legado não conseguiu determinar. O pacote roda sem elas, com o buraco declarado na spec de cada feature. É a pauta da primeira conversa com quem conhece o negócio.

- [x] [001] Qual é o país de operação da clínica, e portanto a regra de formato de telefone? → ✅ **D05**: Brasil
- [x] [001] Qual combinação de campos caracteriza similaridade entre dois donos? → ✅ **D14**: mesmo celular
- [x] [001] O e-mail e o documento do dono, decididos na Pergunta 15, são obrigatórios? Qual é o formato e o limite de tamanho de cada um? → ✅ **D13**
- [x] [001] A proteção contra dupla submissão, decidida na Pergunta 18, vale para os formulários de animal e de visita também, ou só para o de dono? → ✅ **D16**
- [x] [001] O que acontece hoje quando um atendente grava o dono com a coleção de animais desatualizada? → ✅ coberta pela concorrência otimista (US-5 da 001); suíte do legado em decisoes.md §8
- [x] [002] Qual é o limite de tempo de resposta da listagem, e com qual volume de base? → ✅ **D08**: p95 < 500 ms com 50 mil donos
- [x] [002] Quais bancos serão homologados para o sistema novo? → ✅ **P-05**: só PostgreSQL
- [x] [002] A listagem completa da base, sem filtro, continua acessível a qualquer requisitante, ou passa a depender de papel? → ✅ **D04**: exige login
- [x] [002] O tamanho de página configurável tem valor padrão e faixa permitida? → ✅ **P-06**: 10 por padrão, de 5 a 50
- [x] [003] Quais são os bancos homologados do sistema novo? → ✅ **P-05**: só PostgreSQL
- [x] [003] O campo de situação do animal, decidido na Pergunta 16, tem quais valores e quais transições? → ✅ **D09**: Ativo, Falecido, Transferido
- [x] [003] A data de nascimento do animal passa a ser localizada? → ✅ **P-03**: segue o idioma
- [x] [003] A comparação com o vocabulário de espécies ignora a caixa em qual camada? → ✅ **P-10**: no banco e na aplicação
- [x] [003] O que acontece hoje quando o dono é gravado com a coleção de animais desatualizada? → ✅ coberta pela concorrência otimista (US-5 da 001); suíte do legado em decisoes.md §8
- [x] [004] O veterinário entra na operação ou não? → ✅ **D01**: opcional no atendimento
- [x] [004] Qual é a janela de retroatividade? → ✅ **D06**: sem limite; data futura recusada
- [x] [004] Quais são as situações da visita e quais transições são válidas? → ✅ **D10**
- [x] [004] Quem observa a passagem do tempo? → ✅ **D11**: ninguém; "pendente de registro" é derivado
- [x] [004] A notificação ao dono, decidida na Pergunta 3, vai por qual canal, em que momento e com que conteúdo? → ✅ **D12**: WhatsApp (Meta Cloud API) ao agendar e no D-1
- [x] [004] Pode haver agendamento para animal com situação de falecido? → ✅ **D09**: não
- [x] [004] A descrição da visita vira dado clínico? → ✅ **D26**: atendimento clínico enxuto
- [x] [005] Existe consumidor real da rota de dados do catálogo? → ✅ **D22**: não; a rota sai
- [x] [005] A situação de vínculo do veterinário tem quais valores, e quais transições? → ✅ **P-09**: Ativo e Desligado, com reativação
- [x] [005] Qual é o prazo de validade da memória do catálogo? → ✅ **P-08**: invalidação por escrita e TTL de 10 min
- [x] [005] A paginação da página pública e o limite da resposta de dados são o mesmo número? → ✅ moot: a resposta de dados saiu (D22); a paginação segue P-06
- [x] [005] A ordenação explícita de CA-2.2 é por qual critério? → ✅ **P-07**: sobrenome, nome
- [x] [006] Qual é o idioma padrão do sistema novo? → ✅ **P-01**: pt-BR
- [x] [006] A verificação de completude trata o arquivo vazio de recurso como exceção declarada? → ✅ moot: nenhum catálogo do legado é portado; P-02 define pt-BR e en
- [x] [006] Formato de data e de número acompanham o idioma? → ✅ **P-03**: seguem o idioma
- [x] [006] A proteção genérica contra dupla submissão vale para quais formulários? → ✅ **D16**: todos os formulários de gravação
- [x] [006] O controle de troca de idioma aparece também nas telas que a feature 008 serve? → ✅ **P-04**: sim, em todas as telas
- [x] [007] A listagem completa da base de clientes fica aberta ou fechada? → ✅ **D04**: exige login
- [x] [007] A coluna de autoria existe ou não? → ✅ **D02**: sim, por pessoa
- [x] [007] Qual é o tempo de inatividade que expira a sessão? → ✅ **D19**: 8 horas
- [x] [007] O que, do histórico clínico, precisa ser preservado por obrigação legal? → ✅ **D24**: preserva todo o histórico (prazo do CFMV a confirmar)
- [x] [007] Houve eliminação de dado pessoal no passado, por fora do sistema? → ✅ moot: o legado nunca operou (Pergunta 13); não há base a migrar
- [x] [007] A anonimização alcança o dono apenas, ou também dado pessoal em campo livre? → ✅ **D25**: revisão pelo Administrador
- [x] [007] O dono é um ator do sistema? → ✅ **P-12**: não
- [x] [008] A superfície de gestão fica aberta ou protegida? → ✅ **D03**: protegida, só as sondas abertas
- [x] [008] Para onde vão as credenciais que hoje estão em texto puro no repositório? → ✅ **P-13**: Secret do K8s via External Secrets
- [x] [008] Quais indicadores de uso acompanhar? → ✅ **D27**
- [x] [008] Qual é o APM ou o log de produção a que se pode ter acesso? → ✅ moot: o legado nunca operou; o sistema novo usa OpenTelemetry e Grafana (P-16)
- [x] [008] Quais são os tempos de espera das sondas? → ✅ **P-16**
- [x] [008] O log tem prazo de retenção, e ele é compatível com CA-5.3? → ✅ **P-16**: 30 dias, sem dado pessoal
- [x] [009] Quais são as situações de uma espécie e de um veterinário, e quais transições valem? → ✅ **P-09** e **P-10**
- [x] [009] Existe um papel administrativo, além de leitura e escrita? → ✅ **D18**: sim
- [x] [009] Quais são os bancos homologados? → ✅ **P-05**: só PostgreSQL
- [x] [009] Um veterinário desligado pode ser reativado? → ✅ **P-09**: sim, pelo Administrador
- [x] [009] Renomear uma espécie muda o valor que o formulário envia. Isso quebra algum consumidor? → ✅ **P-10**: o formulário envia o identificador; renomear não quebra
- [x] [009] A especialidade é criada por quem? → ✅ **P-11**: Administrador
- [x] [010] Qual padrão de acessibilidade e qual nível? → ✅ **D07**: WCAG 2.2 AA
- [x] [010] A aplicação pode ser executada e observada? → ✅ **D21**: upstream clonado; suíte verde (decisoes.md §8)
- [x] [010] A identidade visual do legado é para preservar? → ✅ **D23**: identidade nova LubyVet
- [x] [010] Qual é a família de fontes e quais pesos? → ✅ **D37**: Figtree 400/500/600/700
- [x] [010] Qual compilador de estilo? → ✅ **D23**: Tailwind
- [x] [010] Quatro formulários continuam sendo quatro? → ✅ não: dono, animal, agendamento, atendimento e os administrativos (plan da 010)

## Fora deste pacote · 0

Nada ficou de fora: todos os cards do backlog entraram.

## O que tem nesta pasta

```
index.md                     este roteiro
AGENTS.md                    contexto canônico dos agentes de código (CLAUDE.md aponta para ele)
docs/padroes/                padrões de arquitetura, código, testes, contratos, banco, front e git
.specify/README.md           o pacote descrito pelo agente que o escreveu
memory/constitution.md       os limites que valem para tudo
.specify/specs/NNN-<feature>/
  spec.md                    o quê e por quê, sem tecnologia
  plan.md                    como, com a stack e o modelo de dados
  tasks.md                   em que ordem, um checkbox por tarefa
.specify/index.json          o mesmo conteúdo em dados, que é o que a tela do Studio lê
```
