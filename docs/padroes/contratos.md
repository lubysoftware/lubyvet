# Contratos

Rota, campo, envelope, código de erro e status são contrato (P9). O contrato é escrito
primeiro, em `packages/contracts`, e a API e o web o consomem (D32).

## Onde mora

```
packages/contracts/src/
  owners/owner.schema.ts     RegisterOwnerInput, ChangeOwnerContactInput, OwnerOutput, OwnerListOutput
  pets/pet.schema.ts
  visits/…
  errors.ts                  catálogo de códigos de erro e envelope
  routes.ts                  tabela de rotas: método, caminho, entrada, saída, erros, papel exigido
  index.ts
```

## Regras dos schemas

- Um schema por direção: `…Input` (o que a rota aceita) e `…Output` (o que devolve). A
  entidade de domínio nunca é o schema de saída.
- Os limites (tamanho, formato) são definidos uma vez, como constantes exportadas
  (`OWNER_LIMITS.firstName = 30`), e usados pelo schema zod e pelo `schema.prisma`. Um teste
  compara os dois (P3, P6).
- Alteração parcial segue a decisão da Pergunta 22: campo ausente não muda; campo presente e
  vazio limpa, e aí a obrigatoriedade reprova. Isso fica explícito no schema de entrada de
  alteração.
- Saída nunca tem campo de estado de persistência (`isNew`, `new`), nem dado que a pessoa não
  pode ver pelo papel.
- O OpenAPI é gerado dos schemas e da tabela de rotas, e versionado em
  `packages/contracts/openapi.json`. O `verify` regenera e falha se houver diferença não
  commitada.

## Rotas (P-24, proposto)

- Prefixo `/api`, recursos no plural em inglês, aninhados pelo dono (P1):
  `/api/owners`, `/api/owners/:ownerId`, `/api/owners/:ownerId/pets/:petId`,
  `/api/owners/:ownerId/pets/:petId/appointments/:appointmentId`.
- Não existe `/api/pets/:id` nem `/api/appointments/:id`.
- Listagem paginada: `?page=1&pageSize=10` (P-06: 10 por padrão, de 5 a 50) e resposta
  `{ items, page, pageSize, total }`.
- Ação que não é CRUD vira sub-recurso com verbo: `POST …/appointments/:id/cancel`,
  `POST /api/owners/:ownerId/anonymize`.

## Envelope de erro (P-24, proposto)

```json
{ "error": { "code": "validation_failed", "fields": [{ "path": "cpf", "code": "cpf_taken" }] } }
```

| status | quando | `code` de exemplo |
|---|---|---|
| 401 | sem sessão | `unauthenticated` |
| 403 | papel não permite | `forbidden` |
| 404 | recurso não existe **ou não pertence ao dono da URL** (P1) | `owner_not_found`, `pet_not_found` |
| 409 | versão vencida (US-5 da 001) | `stale_version`, com `current` trazendo os valores atuais |
| 422 | entrada inválida ou regra violada | `validation_failed` com `fields`, ou `invalid_transition` |
| 500 | inesperado | `internal_error`, com `occurrenceId` |

Todo `code` existe em `errors.ts`, e todo `code` tem tradução nos catálogos do web (P7).

## Idempotência (P-25, proposto)

Toda rota de gravação aceita o cabeçalho `Idempotency-Key` (D16). O formulário gera a chave
ao renderizar. A API guarda o resultado da primeira execução por 24 horas e devolve o mesmo
resultado para a repetição. Sem a chave, a API recusa com 422 `idempotency_key_required`.
