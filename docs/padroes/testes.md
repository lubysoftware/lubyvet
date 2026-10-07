# Padrões de teste

O teste é a definição de pronto: um critério de aceite (`CA-x.y`) sem teste não está
entregue, e os testes que os cards trouxeram (`UT-nnn-n`) existem com esse nome.

## Os níveis

| nível | o que prova | ferramenta | onde mora | precisa de |
|---|---|---|---|---|
| **Unidade** | regra de domínio e orquestração do caso de uso | Jest | ao lado do arquivo: `*.spec.ts` | nada: sem Nest, sem banco, sem rede |
| **Integração** | adaptador contra a tecnologia real: repositório Prisma, restrições do banco, migrações, cache, fila, concorrência | Jest + Testcontainers | `apps/api/test/integration/*.int-spec.ts` | Docker |
| **API ponta a ponta** | a rota como contrato: campos de entrada, forma da resposta, status, autorização, P1 | Jest + supertest + Testcontainers | `apps/api/test/e2e/*.e2e-spec.ts` | Docker |
| **Componente** | tela e componente do web: renderização, validação do formulário, tradução, acessibilidade | Vitest + Testing Library + jsdom | ao lado do arquivo: `*.test.tsx` | nada |
| **E2E do web** | fluxo do usuário de ponta a ponta, contraste e acessibilidade nos dois temas | Playwright + axe | `apps/web/e2e/*.spec.ts` | a stack do `docker-compose.yml` |
| **Desempenho** | D08: p95 < 500 ms com 50 mil donos | script dedicado | `apps/api/test/perf/` | Docker; fora do `verify` |

Proporção esperada: muitos testes de unidade, integração para cada adaptador, uma suíte de
API ponta a ponta por rota, e poucos E2E do web, só para os fluxos que a recepção usa todo
dia.

## Qual nível escrever

- A regra está no domínio (CPF válido, transição de situação, pendente de registro)?
  **Unidade.**
- Depende do banco fazer a coisa certa (unicidade, `LOWER(name)`, versão, cascata,
  anonimização)? **Integração.** Teste de unidade com repositório falso não prova restrição
  de banco.
- É sobre a rota (campo, status, 422, 401/403, um dono pedindo animal de outro)?
  **API ponta a ponta.**
- É sobre o que a pessoa vê ou digita? **Componente**. Atravessa telas? **E2E do web.**
- Corrida entre duas gravações (US-5 da 001, US-2 da 003)? **Integração com duas conexões
  reais e gravações em paralelo.** Executor que serializa passa sem provar nada.

## Nomes

- O `describe` nomeia o caso de uso ou a rota; o `it` descreve o comportamento em
  português, como frase do critério.
- Se o teste vem de um card, ele começa com o id: `it('UT-017-3: recusa animal que não
  pertence ao dono informado', ...)`. Assim `grep UT-017` acha a prova do critério.
- Um `it` prova uma coisa. Nada de `it('funciona')`.

## Dados de teste

- **Construtores**, nunca objetos montados à mão em cada teste:
  `anOwner().withCpf(validCpf()).build()`, `aPet().of(owner).named('Thor').build()`.
  Ficam em `apps/api/test/builders/`.
- **Só dado sintético.** CPF gerado com dígito verificador válido (`validCpf()`), celular
  `+55119` mais oito dígitos aleatórios, nomes de uma lista fixa. Nenhum dado real, nem
  copiado da base de exemplo do legado.
- **Relógio fixo:** `FixedClock` em `2026-10-07T12:00:00-03:00` por padrão; os testes de
  data mudam o relógio explicitamente. `TZ=America/Sao_Paulo` na configuração do Jest e do
  Vitest.
- **Banco isolado:** um contêiner Postgres por execução (`globalSetup`), migrações aplicadas
  uma vez com `prisma migrate deploy`, e `TRUNCATE ... RESTART IDENTITY CASCADE` das tabelas
  de negócio no `beforeEach`. Os testes de concorrência abrem as próprias conexões.

## Testes que a constituição exige

Cada princípio tem um teste obrigatório. Uma revisão que não encontrar o teste reprova a
mudança.

| princípio | teste | nível |
|---|---|---|
| P1 | pedir animal, agendamento e atendimento de um dono usando o id de outro dono, **em toda rota que recebe os dois**, espera 404; o teste percorre a lista de rotas do contrato, para que rota nova entre sozinha | API ponta a ponta |
| P2 | para cada tabela com dado pessoal: anonimizar, conferir que o identificável saiu, que o histórico ficou e que `updated_at` mudou | integração |
| P3 | comparar coluna por coluna o `@map` do schema Prisma com `information_schema` do banco migrado; e para cada campo com limite, gravar no máximo (aceita) e no máximo + 1 (recusa) pela rota | integração + API |
| P4 | cada comportamento que depende de "novo" tem um teste que o nomeia (`isNew`) | unidade |
| P5 | `prisma migrate diff` sem diferença entre schema e migrações | `verify` |
| P6 | cada regra das specs tem um teste que entra pela rota e chega ao banco | API ponta a ponta |
| P7 | completude dos catálogos (`pt-BR`, `en`) contra os códigos de `@lubyvet/contracts`: chave faltando ou chave sem uso reprova | unidade (web) |
| P8 | o próprio `bun run verify` | CI |
| P9 | por rota: os campos de entrada, a resposta validada contra o schema de saída do contrato, e os status declarados; nenhuma resposta tem campo de persistência | API ponta a ponta |
| D07 | axe e contraste em todas as telas, nos dois temas | E2E do web |
| P-16 | o log de uma gravação de dono não contém nome, CPF, celular nem e-mail | integração |

## Cobertura (D44)

O `bun run verify` reprova abaixo destes números:

| camada | linhas | ramos |
|---|---|---|
| `apps/api/src/modules/*/domain/` | 90% | 90% |
| `apps/api/src/modules/*/application/` | 90% | 90% |
| `apps/web/src/features/**/components/` | 70% | 70% |

Adaptadores (`infra/`, `interface/`) não têm meta numérica: eles são provados pelos testes de
integração e de API, que contam no relatório mas não no limite. Cobertura alta com asserção
fraca não vale; cada teste afirma um resultado observável.

## Exemplos

### Unidade: regra de domínio

```ts
// apps/api/src/modules/visits/domain/appointment.spec.ts
import { anAppointment } from '../../../../test/builders/appointment.builder';
import { FixedClock } from '../../../shared/domain/clock';
import { InvalidTransition } from './appointment.errors';

describe('Appointment', () => {
  const clock = FixedClock.at('2026-10-07T12:00:00-03:00');

  it('fica pendente de registro quando a data passou e continua agendado (D11)', () => {
    const appointment = anAppointment().scheduledFor('2026-10-06T09:00:00-03:00').build();

    expect(appointment.isPendingRecord(clock)).toBe(true);
    expect(appointment.status).toBe('scheduled');
  });

  it('recusa cancelar depois que a data passou (D10)', () => {
    const appointment = anAppointment().scheduledFor('2026-10-06T09:00:00-03:00').build();

    expect(() => appointment.cancel(clock)).toThrow(InvalidTransition);
  });
});
```

### Integração: restrição do banco e concorrência

```ts
// apps/api/test/integration/pets.int-spec.ts
import { testDb } from '../support/test-db';
import { PrismaOwnerRepository } from '../../src/modules/owners/infra/prisma-owner.repository';
import { anOwner, aPet } from '../builders';
import { PetNameTaken } from '../../src/modules/pets/domain/pet.errors';

describe('PrismaOwnerRepository: nome de animal por dono', () => {
  beforeEach(() => testDb.truncate());

  it('UT-014-3: recusa "thor" quando o dono já tem "Thor" (LOWER(name))', async () => {
    const repo = new PrismaOwnerRepository(testDb.client());
    const owner = await repo.save(anOwner().withPet(aPet().named('Thor')).build());

    await expect(repo.addPet(owner.id, aPet().named('thor').build())).rejects.toBeInstanceOf(PetNameTaken);
  });

  it('UT-014-5: duas gravações simultâneas do mesmo nome geram um animal só', async () => {
    const owner = await new PrismaOwnerRepository(testDb.client()).save(anOwner().build());
    const [a, b] = [testDb.newClient(), testDb.newClient()];

    const results = await Promise.allSettled([
      new PrismaOwnerRepository(a).addPet(owner.id, aPet().named('Mel').build()),
      new PrismaOwnerRepository(b).addPet(owner.id, aPet().named('Mel').build()),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await testDb.count('pets', { owner_id: owner.id })).toBe(1);
  });
});
```

### API ponta a ponta: contrato e P1

```ts
// apps/api/test/e2e/pets.e2e-spec.ts
import request from 'supertest';
import { PetOutput } from '@lubyvet/contracts/pets';
import { bootApp, loginAs } from '../support/app';
import { seedOwnerWithPet } from '../support/seed';

describe('GET /api/owners/:ownerId/pets/:petId', () => {
  it('UT-017-1: responde 404 quando o animal é de outro dono (P1)', async () => {
    const app = await bootApp();
    const cookie = await loginAs(app, 'reader');
    const [mariana, marcos] = [await seedOwnerWithPet(), await seedOwnerWithPet()];

    const res = await request(app.getHttpServer())
      .get(`/api/owners/${mariana.id}/pets/${marcos.petId}`)
      .set('Cookie', cookie);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'pet_not_found' } });
  });

  it('devolve o animal no formato do contrato, sem campo de persistência (P9)', async () => {
    const app = await bootApp();
    const owner = await seedOwnerWithPet();

    const res = await request(app.getHttpServer())
      .get(`/api/owners/${owner.id}/pets/${owner.petId}`)
      .set('Cookie', await loginAs(app, 'reader'));

    expect(res.status).toBe(200);
    expect(PetOutput.strict().parse(res.body)).toBeTruthy();
  });
});
```

### Componente: formulário com o schema do contrato

```tsx
// apps/web/src/features/owners/components/owner-form.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/render';
import { OwnerForm } from './owner-form';

it('mostra o erro de CPF no próprio campo, sem perder o que foi digitado', async () => {
  const onSubmit = vi.fn();
  renderWithIntl(<OwnerForm onSubmit={onSubmit} />, { locale: 'pt-BR' });

  await userEvent.type(screen.getByLabelText('CPF'), '123.456.789-00');
  await userEvent.click(screen.getByRole('button', { name: 'Cadastrar dono' }));

  expect(screen.getByLabelText('CPF')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('CPF')).toHaveValue('123.456.789-00');
  expect(onSubmit).not.toHaveBeenCalled();
});
```

### E2E do web: fluxo e acessibilidade

```ts
// apps/web/e2e/encounter.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const theme of ['light', 'dark'] as const) {
  test(`registra o atendimento de uma visita pendente (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/owners/1');

    await page.getByRole('button', { name: 'Registrar atendimento' }).first().click();
    await page.getByLabel('Queixa principal').fill('Vômito há 2 dias');
    await page.getByRole('button', { name: 'Registrar atendimento' }).last().click();

    await expect(page.getByText('Atendimento registrado')).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  });
}
```

Os exemplos mostram a forma. Nomes de helper (`bootApp`, `testDb`, `renderWithIntl`) nascem
na tarefa de fundação, em `apps/api/test/support/` e `apps/web/src/test/`.
