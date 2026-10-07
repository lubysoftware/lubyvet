# Padrões de código

Valem para `apps/api`, `apps/web` e `packages/contracts`. O lint aplica o que dá para
aplicar; o resto é revisão.

## TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- Proibido `any`. Valor desconhecido de fora (corpo HTTP, mensagem da fila, resposta da Meta)
  é `unknown` e passa por um schema zod antes de ser usado.
- Proibido `as` para forçar tipo, exceto `as const`. Precisou de cast, faltou um schema ou
  um tipo.
- Proibido `!` (non-null assertion). Trate o ausente.
- `import type` para importar só tipo.
- Nada de `enum` do TypeScript: use união de literais com `as const`
  (`const APPOINTMENT_STATUS = ['scheduled', 'done', 'cancelled', 'no_show'] as const`).
- Funções exportadas e métodos públicos declaram o tipo de retorno.

## Nomes

- Em inglês, pelo vocabulário do domínio: `Owner`, `Pet`, `Appointment`, `Encounter`, `Vet`,
  `Species`, `Specialty`. Não `Client`, `Customer`, `Animal` ou `Visit` genérico.
- Arquivos em `kebab-case`: `register-owner.use-case.ts`, `prisma-owner.repository.ts`,
  `owner.controller.ts`.
- Sufixos por papel: `.use-case.ts`, `.port.ts`, `.repository.ts`, `.controller.ts`,
  `.module.ts`, `.schema.ts` (contratos), `.spec.ts` (unidade), `.int-spec.ts` (integração),
  `.e2e-spec.ts` (API ponta a ponta), `.test.tsx` (componente do web).
- Booleano com prefixo de pergunta: `isNew`, `hasConsent`, `canSchedule`.

## Funções e classes

- Entidade carrega comportamento: `owner.changeContact(...)`, `appointment.cancel(clock)`,
  não um serviço que mexe nos campos de fora.
- Objeto de valor para o que tem regra própria: `Cpf`, `BrazilianMobile`, `Email`,
  `WeightKg`. Ele valida na criação e é imutável.
- Uma função faz uma coisa. Passou de ~40 linhas ou de três níveis de indentação, quebre.
- Sem estado global mutável. Configuração entra por injeção.

## Texto, datas e números

- Nenhum texto visível ao usuário no código (P7). A API devolve códigos; o web traduz.
- Datas trafegam em ISO 8601 com fuso (`2026-10-07T09:00:00-03:00`). Data sem hora
  (nascimento, retorno) é `YYYY-MM-DD`. O fuso de negócio é `America/Sao_Paulo`.
- Peso é decimal com duas casas (`12.40`), formatado só na interface.
- Celular é gravado em E.164 (`+5511987654321`, D05) e CPF só com dígitos (D13).

## Log

- Logger estruturado (pino), um evento por linha, com `requestId`.
- **Nunca** loga nome, CPF, celular, e-mail, endereço nem texto livre. Dono e animal aparecem
  pelo id (CA-5.3 da 008). O serializador do logger remove esses campos por nome, e um teste
  garante isso.
- Nada de `console.log` fora de script de desenvolvimento.

## Comentários

- Comentário explica o porquê de uma decisão não óbvia e cita a origem: `// D11: pendente
  é derivado na leitura, nunca gravado`.
- Não comente o que o código já diz. Não deixe código comentado.

## Dependências

- Nova dependência de runtime exige motivo no commit e versão fixa no lockfile.
- Não entra biblioteca de movimento, de gerenciamento de estado global nem de UI fora do
  shadcn/ui sem decisão registrada.
