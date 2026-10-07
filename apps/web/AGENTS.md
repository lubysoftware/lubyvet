# AGENTS.md — apps/web

Next.js (App Router) com shadcn/ui e Tailwind 4. É só apresentação (D31). Vale tudo do
`AGENTS.md` da raiz; aqui ficam as regras desta pasta.

## Antes de escrever

- O design system do LubyVet (https://claude.ai/artifact/23K7PeRUqVMc6XjjvWY8Lj, D42): leia
  o README e o cartão do componente que você vai usar. A seção Implementação mapeia os
  tokens para o shadcn/ui.
- `docs/padroes/frontend.md`: estrutura, formulários, texto e URL.
- `docs/padroes/testes.md`: componente com Vitest, fluxo com Playwright.

## Regras desta pasta

- Nenhuma regra de negócio, nenhum acesso a banco, nenhum dado pessoal em `localStorage` ou
  na URL.
- Nenhum valor visual solto: cor, espaço, raio, sombra, duração e curva vêm dos tokens.
- Nenhuma string visível no JSX: tudo pelo catálogo `next-intl`, inclusive erros a partir do
  `code` da API.
- Formulário usa o schema de entrada de `@lubyvet/contracts` no resolver, manda
  `Idempotency-Key` e desabilita o botão durante o envio.
- Componente do shadcn entra por `npx shadcn add`, em `src/components/ui/`, e é ajustado aos
  tokens. Não se copia componente de template de terceiros.
- Toda tela nova ganha teste de componente e entra no E2E de acessibilidade nos dois temas
  (D07, D38).

## Comandos

```bash
npm run dev       -w apps/web
npm run test:unit -w apps/web   # Vitest
npm run test:e2e  -w apps/web   # Playwright + axe
```
