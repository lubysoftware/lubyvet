# AGENTS.md — packages/contracts

Os schemas zod de entrada, saída e erro de cada rota, e o OpenAPI gerado a partir deles
(D32). É o contrato público (P9): o que muda aqui muda a API e o web ao mesmo tempo.

## Antes de escrever

`docs/padroes/contratos.md`: rotas, envelope de erro, idempotência e alteração parcial.

## Regras desta pasta

- **Mudar um contrato já publicado é item 2 do Não negociável da constituição: pare e
  pergunte.** Acrescentar campo opcional de saída ou rota nova segue o fluxo normal.
- Só `zod` como dependência de runtime. Nada de Nest, Prisma ou React aqui.
- Limites de tamanho e formato são constantes exportadas (`OWNER_LIMITS`), usadas pelo schema
  e pelo `schema.prisma`.
- Todo código de erro novo entra em `errors.ts` e ganha tradução nos dois catálogos do web
  no mesmo commit (P7).
- Schema de saída não tem campo de persistência nem dado que o papel não pode ver.
- Depois de mudar um schema ou a tabela de rotas, regenere o `openapi.json` e commite junto.
  O `verify` falha se ele estiver desatualizado.

## Comandos

```bash
npm run build     -w packages/contracts
npm run openapi   -w packages/contracts   # regenera openapi.json
npm run test:unit -w packages/contracts
```
