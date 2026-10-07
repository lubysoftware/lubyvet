# Arquitetura: portas e adaptadores

Decisão D20: o domínio e os casos de uso não conhecem framework, banco, cache, fila nem
HTTP. Eles falam com o mundo por **portas** (interfaces), e o mundo entra por
**adaptadores**. A regra é verificada por máquina, não por revisão.

## Módulos da API

Um módulo por contexto do domínio, em `apps/api/src/modules/<contexto>/`:

| módulo | features | agregado / entidades |
|---|---|---|
| `owners` | 001, 002 | Owner (raiz) |
| `pets` | 003 | Pet, sempre dentro de Owner |
| `visits` | 004 | Appointment e Encounter (D10, D26), dentro de Pet |
| `vets` | 005 | Vet, Specialty |
| `vocabularies` | 009 | Species, Specialty (administração) |
| `identity` | 007 | User, Session, Role (D17, D18) |
| `notifications` | 004 (D12) | OutboxMessage; porta `OwnerNotifier` |
| `operations` | 008 | sondas, métricas (D27), tratamento de erro |

Cada módulo tem quatro pastas, e a dependência só aponta para dentro:

```
modules/owners/
  domain/          entidades, objetos de valor, regras, erros de domínio. TypeScript puro.
  application/     casos de uso e as portas que eles precisam (application/ports/).
  infra/           adaptadores de saída: repositório Prisma, cache Redis, publicador RabbitMQ.
  interface/http/  adaptador de entrada: controller NestJS, pipe de validação zod, mapeamento de erro.
  owners.module.ts ligação NestJS: qual adaptador implementa qual porta.
```

| pasta | pode importar | não pode importar |
|---|---|---|
| `domain/` | `domain/` do próprio módulo, `src/shared/domain/`, e só as regras puras e os limites de `@lubyvet/contracts` (`rules/`, `*_LIMITS`), para valerem igual no formulário e no domínio (P6) | NestJS, Prisma, zod, qualquer outra pasta |
| `application/` | `domain/`, `application/` do próprio módulo, `src/shared/` | NestJS, Prisma, Redis, RabbitMQ, `infra/`, `interface/` |
| `infra/` | `application/ports`, `domain/`, bibliotecas de infraestrutura | `interface/` |
| `interface/http/` | casos de uso de `application/`, `@lubyvet/contracts`, NestJS | `infra/`, `@prisma/client`, `application/ports/` (nem só o tipo: o controller chama caso de uso, 011/T006) |

Um módulo usa outro só pela porta pública do outro (`application/ports/`), nunca
importando o `domain/` alheio. A regra é escrita no `.dependency-cruiser.cjs` e roda em
`bun run verify`. Um import proibido reprova o build.

**Módulo sem `domain/`, de propósito.** `operations` e `vocabularies` não têm pasta de
domínio. `operations` só lê estado agregado (saúde do banco, contagens de D27) e
`vocabularies` mantém cadastro de espécie e veterinário sem regra própria além do formato
do nome (que já mora em `vets/domain`) e da unicidade (que é restrição do banco). Criar
entidade ali seria cerimônia sem regra para proteger. Quando surgir uma regra de verdade
(por exemplo, uma transição de situação com condição), o `domain/` nasce junto com ela e
com o teste de unidade dela. `identity` tinha o mesmo formato até a 011 dar domínio ao
bloqueio por tentativas (P-15).

## Portas e casos de uso

- A porta é uma interface em `application/ports/`, nomeada pelo que o caso de uso precisa,
  não pela tecnologia: `OwnerRepository`, `OwnerNotifier`, `VetCatalogCache`, `Clock`,
  `IdempotencyStore`. Nunca `PrismaOwnerRepository` na porta.
- O adaptador implementa a porta com o nome da tecnologia: `PrismaOwnerRepository`,
  `RabbitOwnerNotifier`, `MetaWhatsAppSender`, `FakeOwnerNotifier` (o padrão enquanto a conta da Meta não existe, D28).
- Um caso de uso é uma classe com um método `execute(input)`, nomeada pelo verbo do
  domínio: `RegisterOwner`, `ChangeOwnerContact`, `RecordEncounter`, `AnonymizeOwner`.
  Recebe as portas pelo construtor e devolve um resultado do domínio, nunca uma resposta
  HTTP.
- O tempo entra pela porta `Clock`. Ninguém chama `new Date()` fora do adaptador de relógio,
  e os testes controlam a data.
- A identidade de quem faz a ação (D02) entra no caso de uso como parâmetro (`actor`), nunca
  lida de contexto global.

## Regras da constituição traduzidas para código

| princípio | como aparece no código |
|---|---|
| P1, dono é a porta | `OwnerRepository` expõe `findPet(ownerId, petId)` e `findAppointment(ownerId, petId, appointmentId)`. **Não existe** `PetRepository.findById` nem `VisitRepository.findById`. O teste de isolamento é escrito antes da implementação. |
| P2, anonimizar | Não existe método `delete` em repositório de dado pessoal. `AnonymizeOwner` troca os campos identificáveis e preserva o histórico (D24). |
| P3, nome declarado | Ver `banco.md`: `@map` em toda coluna, com teste que compara schema e banco. |
| P4, id do banco | O id da entidade é `number \| undefined`; `isNew()` é `id === undefined`, escrito explicitamente. Nada gera id na aplicação. |
| P6, uma regra, um lugar | A regra mora no domínio. O zod do contrato valida forma (tamanho, formato); o domínio valida regra (CPF único, transição de situação). O erro de unicidade do banco é traduzido pelo nome da restrição para um erro de domínio tipado. |
| P7, texto no catálogo | Domínio e API devolvem **códigos** (`cpf_taken`), nunca frases. |
| P9, contrato | A forma das respostas vem de `@lubyvet/contracts`. Entidade de domínio nunca é serializada direto. |

## Erros

- Erro de domínio é uma classe que estende `DomainError` (`src/shared/domain/errors.ts`), com
  um `code` que existe no catálogo de códigos de `@lubyvet/contracts`: `OwnerNotFound`
  (`owner_not_found`), `CpfAlreadyRegistered` (`cpf_taken`), `StaleVersion`
  (`stale_version`), `InvalidTransition` (`invalid_transition`).
- O mapeamento de erro de domínio para status HTTP fica num único filtro de exceção
  (`src/shared/interface/http/domain-error.filter.ts`): não encontrado 404, regra violada
  422, versão vencida 409, sem identificação 401, sem permissão 403.
- Nenhum código decide o tratamento lendo o texto de uma exceção (P6).
- Erro inesperado vira 500 com um id de ocorrência, e o log registra o id, não o dado (D08 e
  US-5 da 008).

## Processos

Uma imagem, três entrypoints (P-18):

| entrypoint | o que roda |
|---|---|
| `src/main.ts` | API HTTP |
| `src/worker.ts` | consumidor do RabbitMQ (envio de WhatsApp) e publicador do outbox |
| `src/commands/reminders-d1.ts` | lembretes de D-1, chamado pelo `CronJob` às 10:00 (D29) |
