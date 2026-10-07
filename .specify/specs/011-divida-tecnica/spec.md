# Dívida técnica da primeira entrega

**Origem:** revisão da estrutura de código feita depois da entrega das features 001 a 010 (sessão de 07/10/2026)
**Cards:** nenhum. É dívida interna, sem comportamento novo para quem usa o balcão.

## Por que esta feature existe

As dez features foram entregues e a suíte de aceitação confirma os 193 critérios. A revisão da
estrutura, feita em seguida, apontou cinco lugares em que o código cumpre o critério mas se
afasta do que a arquitetura (`docs/padroes/arquitetura.md`), a D27 ou o padrão de front
(`docs/padroes/frontend.md`) pedem. Nenhum deles é defeito visível. Todos tornam a próxima
mudança mais cara ou o teste mais frágil, e por isso viram tarefa antes de crescer.

**O que não muda:** nenhuma rota, campo, envelope ou status (P9). Cada história é refatoração
com o comportamento preso pelos testes de aceitação que já existem; se um deles precisar mudar
para a refatoração passar, a refatoração está errada.

## Histórias de usuário

### US-1 Dar domínio próprio à identidade

Como equipe, quero que as regras de acesso (bloqueio por tentativas, expiração por
inatividade, papel) morem num domínio testável sem banco nem Redis, como já acontece com dono,
animal e visita.

**Critérios de aceite**

- [ ] CA-1.1 O bloqueio depois de cinco senhas erradas (P-15) e o desbloqueio pelo tempo são regras de uma entidade de domínio da identidade, cobertas por teste de unidade sem infraestrutura
- [ ] CA-1.2 O caso de uso de login só orquestra: lê o usuário pela porta, pede a decisão ao domínio e grava o resultado
- [ ] CA-1.3 `operations` e `vocabularies` ficam sem domínio de propósito, e o motivo está escrito em `docs/padroes/arquitetura.md`

### US-2 Deixar os controllers finos

Como equipe, quero que todo controller só valide, chame um caso de uso e serialize, como manda
o `AGENTS.md` da API.

**Critérios de aceite**

- [ ] CA-2.1 A leitura dos animais atendidos por um veterinário passa por um caso de uso; o controller não decide "não encontrado"
- [ ] CA-2.2 A anonimização e a revisão de texto livre ficam num controller próprio, separado do cadastro e da busca de donos
- [ ] CA-2.3 Um teste de arquitetura falha quando um controller importa porta de repositório ou leitor diretamente

### US-3 Contar as métricas a partir de eventos de domínio

Como operação, quero que os indicadores de D27 venham de eventos publicados num ponto só, como
a própria D27 pede, em vez de chamadas de métrica espalhadas pelos casos de uso.

**Critérios de aceite**

- [ ] CA-3.1 Os casos de uso publicam eventos de domínio (dono cadastrado, visita agendada, atendimento registrado e os demais de D27) por uma porta de eventos, sem conhecer a porta de métricas
- [ ] CA-3.2 Um assinante único traduz evento em métrica; nenhum caso de uso chama a porta de métricas
- [ ] CA-3.3 O evento só é publicado depois de a gravação dar certo; recusa e conflito não contam
- [ ] CA-3.4 As métricas e os rótulos que o teste de aceitação 008/CA-5.4 confere continuam os mesmos

### US-4 Testar comportamento, não texto de código

Como equipe, quero que os testes de aceitação provem o comportamento pela tela ou pela API, e
não procurando trechos no código-fonte, para que uma refatoração correta não quebre teste.

**Critérios de aceite**

- [ ] CA-4.1 Nenhum teste de aceitação lê arquivo de `apps/web/src` ou de `apps/api/src` para provar um critério de comportamento; o que era lido vira teste de tela (Playwright) ou de API
- [ ] CA-4.2 Continuam permitidas, e listadas num só lugar, as verificações que são estruturais por natureza: arquivos versionados, manifesto do Helm, dependências publicáveis, inventário de rotas e catálogo de tradução
- [ ] CA-4.3 A rastreabilidade continua exigindo um teste por critério de aceite

### US-5 Alinhar o front ao padrão escrito

Como equipe, quero que formulário, componentes e estado na URL sigam uma decisão registrada,
seja ela a do padrão original ou a que a prática mostrou funcionar.

**Critérios de aceite**

- [ ] CA-5.1 Formulários seguem uma decisão registrada em `memory/decisoes.md` (react-hook-form com o resolver zod, ou o `useApiForm` ratificado), e `docs/padroes/frontend.md` diz a mesma coisa
- [ ] CA-5.2 As peças de `src/components/ui/` vêm do shadcn/ui ajustadas aos tokens (D35), ou a troca está registrada como decisão
- [ ] CA-5.3 Busca, página, aba e animal escolhido ficam na URL por um mecanismo único (`nuqs`, pelo padrão), sem montagem de query string à mão nas telas
- [ ] CA-5.4 Os testes de componente, o E2E e o axe nos dois temas continuam verdes sem mudar o que verificam

## Fora de escopo

- **Comportamento novo.** Nenhuma tela, rota ou regra nova; a agenda da clínica inteira, por
  exemplo, continua sem spec.
- **Domínio para vocabulários e operação.** São leitura e manutenção de cadastro sem regra
  própria; a US-1 só registra o porquê (CA-1.3).
- **Publicar imagens e pipeline de entrega.** Registro de imagens, digest no chart e CI de
  build são assunto de entrega, não desta dívida.

## Perguntas em aberto

- [ ] **Formulário: react-hook-form ou `useApiForm`?** O padrão original pede react-hook-form. O hook próprio nasceu porque o npm encerra sem erro nesta máquina, mas a instalação pelo bun funciona. Recomendação: adotar react-hook-form com `@hookform/resolvers/zod`, mantendo o `useApiForm` só como camada de envio (Idempotency-Key e 422 por campo).
- [ ] **shadcn/ui pelo CLI.** O `npx shadcn add` não roda aqui; `bunx shadcn add` precisa ser tentado antes de decidir. Se também falhar, a troca vira decisão e as peças ficam como estão.
- [ ] **Barramento de eventos.** Em processo (síncrono, no mesmo request) basta para métrica; se um dia um evento precisar sair do processo, a caixa de saída de D12 já é o caminho. Recomendação: em processo agora.

## Rastreabilidade

| item | vem de |
|---|---|
| US-1 | revisão de estrutura · `apps/api/src/modules/identity` sem `domain/` · P-15, D19 |
| US-2 | revisão de estrutura · `vets.controller.ts` (pacientes), `owners.controller.ts` (anonimização) · `apps/api/AGENTS.md` |
| US-3 | revisão de estrutura · contadores em sete casos de uso · D27 ("calculadas a partir de eventos de domínio") |
| US-4 | revisão de estrutura · testes de aceitação que leem `owners-search-view.tsx`, `result-message.tsx`, `app-shell.tsx` |
| US-5 | revisão de estrutura · `docs/padroes/frontend.md` · D35 · P-22 |
