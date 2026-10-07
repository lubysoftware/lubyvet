# Front-end

`apps/web` é o adaptador de apresentação (D31): renderiza, valida a forma e chama a API.
Não tem regra de negócio, não acessa banco e não guarda dado pessoal no navegador.

## Estrutura

```
apps/web/src/
  app/                       rotas do App Router; arquivos finos que compõem features
    (auth)/login/
    (app)/owners/  (app)/owners/[ownerId]/  (app)/schedule/  (app)/vets/  (app)/admin/
  features/<contexto>/       components/, hooks/, server/ (chamadas à API feitas no servidor)
  components/ui/             componentes do shadcn/ui, tematizados pelos tokens do design system
  lib/api/                   cliente HTTP tipado pelos schemas de @lubyvet/contracts
  i18n/messages/pt-BR.json   catálogos (P7, P-20)
  i18n/messages/en.json
  test/                      helpers de teste
```

## Regras

- **Design system primeiro.** Toda cor, espaço, raio, sombra, duração e curva vem dos tokens
  (D42). Nenhum hex, nenhum `px` solto em componente. Antes de criar componente, veja se o
  design system já tem um e siga o README dele.
- **Leitura no servidor, gravação pela API.** Server Components buscam dados repassando o
  cookie de sessão (D31); formulários chamam `/api` com o cliente tipado (P-22).
- **Formulário:** react-hook-form com o resolver zod do schema de entrada do contrato. O
  erro 422 da API vira erro no campo pelo `path`. O valor digitado nunca se perde. O botão
  fica desabilitado durante o envio, com a `Idempotency-Key` do formulário (D16, P-25).
- **Texto:** `next-intl`. Nenhuma string visível no JSX: tudo pelo catálogo, inclusive
  mensagens de erro, montadas a partir do `code` da API (`t('errors.cpf_taken')`).
- **URL é estado:** busca, filtros, página, aba e animal selecionado ficam na URL (`nuqs`).
  Nenhum dado pessoal na URL.
- **Acessibilidade:** WCAG 2.2 AA nos dois temas (D07, D38). Todo controle tem rótulo, todo
  ícone sozinho tem `aria-label`, e o foco é visível.
- **Tema:** claro, escuro ou sistema, em cookie, aplicado sem piscar no primeiro render
  (T011 da 010).
- **Sem regra de negócio no web.** "Pode agendar este animal?" é a API que responde; o web só
  esconde o botão que a API diria que não pode, e trata a recusa se acontecer.
