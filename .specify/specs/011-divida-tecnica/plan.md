# Plano, Dívida técnica da primeira entrega

## Stack

**Decidida e sem mudança.** Vale o plano das features 001 a 010 (D20, D31 a D35). Esta feature
não acrescenta dependência de runtime à API. No web, pode acrescentar `react-hook-form`,
`@hookform/resolvers` e `nuqs`, conforme a resposta às perguntas em aberto da spec.

## Como não quebrar nada

A rede de segurança já existe: `bun run verify` roda unidade, integração, ponta a ponta,
aceitação (um teste por critério das specs 001 a 010), Playwright com axe nos dois temas e a
regra de fronteira. **Toda tarefa desta feature termina com o verify verde sem alterar o que
os testes de aceitação de 001 a 010 verificam.** A única exceção é a US-4, que troca a forma de
verificar (do texto do código para o comportamento), mantendo o critério verificado.

## Desenho por história

| história | onde mexe | forma |
|---|---|---|
| US-1 | `modules/identity/domain/` (novo) | entidade `Account` com `attempt(passwordOk, now)` devolvendo aceito, recusado ou bloqueado até; o adaptador Redis de sessão continua onde está |
| US-2 | `modules/vets/application`, `modules/owners/interface/http` | caso de uso `ListVetPatients`; `AnonymizationController`; regra nova no `.dependency-cruiser.cjs`: `interface/` não importa `application/ports/` |
| US-3 | `shared/domain/events.ts`, `shared/infra/` | porta `DomainEvents` com `publish(event)`; adaptador em processo; assinante `MetricsSubscriber` em `operations/infra` que traduz evento em contador. Os casos de uso trocam `metrics.increment` por `events.publish` depois da gravação |
| US-4 | `apps/api/test/acceptance`, `apps/web/e2e` | os critérios provados lendo o código do web (001/CA-7.3, 002/CA-1.4, 002/CA-3.1, 002/CA-3.3, 004/CA-1.4, 008/CA-6.2, 008/CA-6.3) passam a ter teste de tela, e os que leem o código da API (001/CA-1.6, 001/CA-2.3, 002/CA-5.2, 003/CA-2.4, 005/CA-5.2, 008/CA-8.3) passam a provar comportamento ou entram na lista estrutural com o motivo; a lista do que continua estrutural fica em `traceability.acceptance-spec.ts` |
| US-5 | `apps/web/src/features/forms`, `components/ui`, telas com query string | conforme a decisão registrada; `nuqs` no layout `(app)` e nas telas de busca, catálogo, administração e ficha |

## Ordem

US-4 primeiro: troca a rede de segurança por uma que não depende do texto do código, e as
outras histórias passam a ser verificadas só por comportamento. Depois US-2 e US-1, que mexem
só na API. US-3 depende de US-2 (controllers finos não contam nada). US-5 por último, depois
da decisão sobre as perguntas em aberto.
