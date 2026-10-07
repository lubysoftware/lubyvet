# Front-end

`apps/web` é o adaptador de apresentação (D31): renderiza, valida a forma e chama a API.
Não tem regra de negócio, não acessa banco e não guarda dado pessoal no navegador.

## Estrutura

```
apps/web/src/
  app/                       rotas do App Router; arquivos finos que compõem features
    (auth)/login/
    (app)/owners/  (app)/owners/[ownerId]/  (app)/vets/  (app)/admin/
  features/<contexto>/       components/, hooks/, server/ (chamadas à API feitas no servidor)
  components/ui/             peças do design system (botão, selo, diálogo) sobre components/ui/base
  components/ui/base/        peças do shadcn/ui geradas por bunx e ajustadas aos tokens (D35, D47)
  lib/api.ts                 leitura no servidor (load, currentSession)
  lib/api-client.ts          gravação no navegador (apiSend), erro pelo envelope do contrato
  lib/url-state.ts           estado na URL por nuqs: leitores e serializadores de cada tela
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
- **Formulário:** `useApiForm` (`features/forms/use-api-form.ts`) valida com o schema de
  entrada do contrato antes de chamar a API; o código do erro de campo vem do próprio schema.
  O erro 422 da API vira erro no campo pelo `path`. O valor digitado nunca se perde (campos
  não controlados). O botão fica desabilitado durante o envio, com a `Idempotency-Key` do
  formulário, que se repete na nova tentativa e se renova depois de gravar (D16, P-25). É a forma
  decidida em D46; react-hook-form não se usa.
- **Texto:** `next-intl`. Nenhuma string visível no JSX: tudo pelo catálogo, inclusive
  mensagens de erro, montadas a partir do `code` da API (`t('errors.cpf_taken')`).
- **URL é estado:** busca, filtros, página, aba e animal selecionado ficam na URL, lidos e
  escritos só pelos leitores e serializadores `nuqs` de `lib/url-state.ts`. Nenhuma tela monta
  query string à mão.
  Nenhum dado pessoal na URL.
- **Acessibilidade:** WCAG 2.2 AA nos dois temas (D07, D38). Todo controle tem rótulo, todo
  ícone sozinho tem `aria-label`, e o foco é visível.
- **Tema:** claro, escuro ou sistema, em cookie, aplicado sem piscar no primeiro render
  (T011 da 010).
- **Sem regra de negócio no web.** "Pode agendar este animal?" é a API que responde; o web só
  esconde o botão que a API diria que não pode, e trata a recusa se acontecer.
