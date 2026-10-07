# AGENTS.md — apps/api

NestJS em portas e adaptadores. Vale tudo do `AGENTS.md` da raiz; aqui ficam as regras
que só existem nesta pasta.

## Antes de escrever

- `docs/padroes/arquitetura.md`: as quatro pastas do módulo e o que cada uma importa.
- `docs/padroes/banco.md`: antes de tocar em `prisma/schema.prisma`.
- `docs/padroes/testes.md`: os níveis e os testes que a constituição exige.

## Estrutura

```
src/
  modules/<contexto>/{domain,application,infra,interface/http}/
  shared/domain/           DomainError, Clock, tipos de id
  shared/interface/http/   filtro de erro, pipe zod, guard de sessão e papel
  main.ts  worker.ts  commands/reminders-d1.ts
prisma/schema.prisma  prisma/migrations/  prisma/seed.ts
test/
  builders/      construtores de dados sintéticos
  support/       testDb (Testcontainers), bootApp, loginAs, seed
  integration/   *.int-spec.ts
  e2e/           *.e2e-spec.ts
  perf/          D08
```

## Regras desta pasta

- `domain/` é TypeScript puro: nada de decorator do Nest, Prisma, zod ou `@lubyvet/contracts`.
- Caso de uso recebe portas pelo construtor e o `actor` como parâmetro; devolve domínio,
  nunca resposta HTTP.
- O controller é fino: valida com o schema de `@lubyvet/contracts`, chama o caso de uso e
  serializa com o schema de saída. Nenhum `if` de regra de negócio no controller.
- Repositório de dado pessoal não tem `delete` (P2). Animal e agendamento se buscam pelo dono
  (P1).
- Erro de domínio tem `code` do catálogo de `@lubyvet/contracts`; o status sai do filtro
  único.
- O tempo vem da porta `Clock`; nada de `new Date()` fora do adaptador.
- Autorização num ponto só: guard global com a matriz de papéis de `src/shared/interface/http/roles.ts`
  (D18). Rota sem papel declarado é recusada por padrão.
- O log não leva dado pessoal (P-16); dono e animal aparecem pelo id.

## Comandos

```bash
bun run --cwd apps/api test:unit   # *.spec.ts, sem Docker
bun run --cwd apps/api test:int   # *.int-spec.ts, Testcontainers
bun run --cwd apps/api test:e2e   # *.e2e-spec.ts, Testcontainers
npx prisma migrate dev --name <nome_em_ingles>
```
