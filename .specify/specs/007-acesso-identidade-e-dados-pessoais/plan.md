# Plano, Acesso, identidade e dados pessoais

## Stack

**Decidida.** `.specify/arquitetura/decision.json`, confirmada em `memory/decisoes.md` D20:
Portas e adaptadores; TypeScript e NestJS como **única porta** para domínio e dados;
Next.js (React) com Tailwind e shadcn/ui como apresentação, na frente da API (D31, D35);
contrato em zod compartilhado gerando o OpenAPI (D32); PostgreSQL (CloudNativePG no cluster) como **único
dialeto** (P5); Prisma e Prisma Migrate com `@map` explícito em toda coluna (P3, D33); Redis;
RabbitMQ; guards do NestJS sobre identidade própria (D17); OpenTelemetry; Jest com
PostgreSQL real na API, Vitest e Playwright no front; Kubernetes agnóstico de provedor (D36). Monorepo
com `apps/api`, `apps/web` e `packages/contracts` (P-18). O build canônico é
`npm run verify` (P-23). As alternativas que a análise levantou e descartou estão em
`.specify/arquitetura/tech-stack.json` e não são reabertas aqui.

A regra de fronteira vale desde o primeiro arquivo: domínio e casos de uso não importam
NestJS, Prisma, Redis nem RabbitMQ. Eles entram só por porta, e o adaptador mora em
`infra/`. O `apps/web` não importa nada de `apps/api` além de `packages/contracts`. Um teste
de fronteira (regra de import) roda dentro de `npm run verify`.

Onde esta feature fala em "formulário", "página" ou "termina na ficha", lê-se pela D31: tela
no Next.js, validação com o mesmo schema zod da API, erro 422 com erros por campo exibidos no
próprio campo, e navegação para a ficha após sucesso.

**O que pesa nesta feature:**

- **D17** identidade em tabela própria: hash argon2id, guard global do NestJS, decisão de
  autorização num ponto só.
- **D18** papéis Leitura, Escrita e Administrador; **D04** sem exceção para a listagem.
- **D19** a sessão expira após 8 horas de inatividade; o store da sessão é o Redis e o
  cookie é `httpOnly`, `secure` e `sameSite=lax`.
- **D02** autoria por pessoa em todas as gravações (`criado_por`, `alterado_por`).
- **P-12** o dono não é ator; **P-15** política de senha.
- **D15** a anonimização zera o CPF, o que libera o índice único parcial.
- **D24** a anonimização preserva todo o histórico clínico; **D25** o texto livre passa por
  revisão do Administrador, trecho a trecho.

## Modelo de dados

Esta é a feature que mais acrescenta ao modelo, e **quase tudo o que ela acrescenta não
existia em forma alguma** no legado: não havia tabela de usuário, de papel, de permissão, de
sessão ou de auditoria, em nenhum dos três dialetos. O único "usuário" do repositório era uma
**conta de banco de dados** num arquivo de criação de permissões, com concessão total e senha
igual ao nome, e ela não é ator do sistema.

### Identidade e papel

Existem **somente** se a decisão de stack número 2 for provedor próprio.

| entidade | campos | observação |
|---|---|---|
| Identidade | identificador, credencial guardada de forma irreversível, papel, situação, datas de criação e de alteração | a credencial **nunca** é comparada de forma que o tempo de resposta distinga usuário existente de inexistente, porque é isso que CA-1.2 e `UT-033-2` exigem ao pedir recusas indistinguíveis "em mensagem e em qualquer outro sinal observável" |
| Papel | **dois**, leitura e escrita | decisão da Pergunta 8. Não é tabela: são dois valores, e a matriz de ações é declaração em arquivo, não dado (CA-2.1) |

**A matriz de permissões do sistema novo tem duas linhas**, onde a do legado tinha uma. O
número é pequeno e a declaração é o que importa: `UT-034-1` exige que acrescentar uma ação em
**um** lugar a torne visível a quem decide, e `UT-034-3` exige que identidade sem papel seja
recusada, em vez de tratada como permitida por ausência de regra. A segunda é a armadilha
clássica, e o legado era o caso extremo dela: sem regra nenhuma, tudo era permitido.

### Anonimização do dono

| campo | onde | de onde vem |
|---|---|---|
| marca de anonimização, com data | no Dono | princípio P2 da constituição, e CA-3.1. O campo foi anunciado no modelo de dados da feature 001, que registra que o Dono é a entidade que ele atinge, e é **aqui** que ele é desenhado |
| registro da operação, com data e executor | em registro próprio, não no Dono | CA-3.4, e a decisão da Pergunta 7, que pediu anonimização mais registro de que o registro foi alterado |

**O que a anonimização apaga e o que ela conserva.** Apaga nome, sobrenome, endereço, cidade e
telefone do dono, mais o e-mail e o documento se eles existirem, decididos na Pergunta 15 e
sem card. Conserva o identificador, os animais, as visitas e o histórico, porque `UT-035-4`
exige que **nenhuma exclusão de animal nem de visita seja solicitada**. A parte que precisa de
cuidado é o caminho inverso: CA-3.2 diz que nenhum caminho de leitura devolve mais nome,
endereço ou telefone daquela pessoa, e isso inclui os caminhos de busca da feature 002. Um dono
anonimizado não pode continuar encontrável pelo sobrenome que ele não tem mais.

### Autoria nas entidades

**Em conflito, e por isso não desenhada aqui.** A Pergunta 12 decidiu colunas de criação e de
alteração **sem autoria**, e CA-4.1 e CA-4.2 pedem autoria. As colunas de criação e de
alteração já estão nos modelos de dados das features 001, 003 e 004, pela própria Pergunta 12.
A coluna de quem **não é criada** enquanto o conflito existir, e os dois critérios vão para a
seção `Sem tarefa` de `tasks.md`.

O que o plano registra, para quem for arbitrar: a decisão de não ter autoria é coerente com a
Pergunta 8, que criou dois papéis funcionais e não pessoas identificadas uma a uma. Se os
papéis forem compartilhados, uma coluna de autoria registra "escrita" e não registra ninguém,
e nesse caso ela é custo sem informação. Se cada pessoa tiver identidade própria, a coluna
registra gente, e aí a decisão da Pergunta 12 custa a rastreabilidade que o card pede. **A
pergunta de fundo é se identidade é por pessoa ou por função**, e ela não foi feita a ninguém.

## Contratos

| operação | entrada | saída | erros |
|---|---|---|---|
| Autenticar | credencial | sessão identificada, com o papel | recusa **genérica**, idêntica para credencial errada e para usuário inexistente, sem diferença em mensagem nem em qualquer sinal observável (CA-1.2) |
| Decidir acesso a um caminho | o caminho pedido e a sessão, quando houver | permitido ou recusado | sem identificação, recusa **antes de qualquer leitura**, de modo que nenhum dado pessoal seja lido para depois ser descartado (`UT-033-1`) |
| Decidir autorização de uma ação | a ação e o papel | permitido ou recusado | recusa que **não distingue** dado existente de inexistente (CA-2.2); identidade sem papel é recusada (`UT-034-3`) |
| Anonimizar um dono | identificador do dono, e a identidade de quem executa | o dono sem dado pessoal, e o registro da operação | sem executor identificado, recusa e nada alterado (`UT-035-5`) |

**A recusa é contrato, e é a parte mais fácil de errar.** Três critérios distintos, CA-1.2,
CA-2.2 e o teste `UT-034-2`, pedem a mesma disciplina: a resposta negativa não pode variar
conforme o que existe do outro lado. Uma recusa que vaza existência transforma qualquer
endereço em oráculo, e o legado não tinha esse problema só porque não recusava nada.

**O caminho de escrita anônimo deixa de existir.** CA-4.3 é a única parte de US-4 que não está
em conflito, e vale escrevê-la como contrato: nenhuma operação de gravação de dono, de animal
ou de visita aceita pedido sem identidade (`UT-033-4`, `UT-036-3`).

**Campos de auditoria vindos de fora são ignorados.** `UT-036-2` exige que um formulário que
tente enviar autoria e momento próprios não consiga. Isso é a mesma disciplina do bloqueio de
identificador na ligação de dados que o legado já tinha (ADR-0008), estendida aos campos novos,
e precisa estar no contrato porque é exatamente o tipo de proteção que se perde numa
refatoração.

## Migração de dados

A resposta da Pergunta 13 vale aqui também: **o sistema nunca operou de verdade, é
demonstração.** E nesta feature a consequência é mais forte que nas outras.

- **Não há identidade a migrar.** Nenhuma tabela de usuário, papel ou sessão existe no legado.
  O que existe é uma conta de banco de dados num arquivo de criação de permissões, com
  concessão total e senha igual ao nome, e ela não é ator do sistema: confundir as duas coisas
  é o erro de leitura mais fácil de cometer aqui.
- **Não há credencial a converter**, e portanto não há o problema clássico de migrar senhas
  guardadas com mecanismo antigo.
- **Não há dado pessoal a anonimizar na migração.** A base nasce vazia, e o caminho de
  anonimização nasce para a vida do sistema novo, não para limpar o passado.
- **Nenhum valor de credencial do legado é reproduzido neste pacote.** O legado trazia
  credencial em texto puro em cinco locais comitados, e o inventário deles está nas lacunas
  G8, G9 e G12 de `integrations/integrations.md`. Nenhum valor foi copiado para cá e nenhum
  deve ser recriado em arquivo do projeto novo: é o item 8 do Não negociável da constituição.
- **O que precisa vir do legado é a lista de superfícies**, não a linha: os 17 pares de método
  e rota, enumerados um a um em `permissions.md`, são o inventário que CA-1.4 e CA-2.3 pedem
  para cobrir. Esse inventário é o ativo mais útil da análise para esta feature.

## Sequência

Ordem interna, pelas dependências declaradas nos cards:

1. **US-1 (REQ-033)** abre a feature e não depende de nada. É pré-requisito das outras três.
2. **US-2 (REQ-034)** depende de US-1.
3. **US-3 (REQ-035)** depende de US-1 e pode andar em paralelo com US-2.
4. **US-4 (REQ-036)** depende de US-1, e dois dos três critérios dependem de arbitragem humana.

**O que esta feature exige de outras:** as features 001, 003 e 004, porque a anonimização
alcança o Dono e precisa que o Animal e a Visita existam para preservá-los; a feature 002,
porque CA-3.2 alcança os caminhos de busca; a feature 006, pelo catálogo de tradução das
mensagens de recusa.

**O que outras features exigem desta:** nada por card, e isso é um achado em si. Nenhuma das
nove outras features declara dependência desta nos `depends_on` dos cards, e ainda assim ela
atravessa todas: cada uma delas diz, em Fora de escopo, que "quem pode fazer isso é a
feature 007". Consequência prática de ordem: **esta feature é cara de fazer no fim**, porque
exigir identificação em 17 superfícies já construídas é mais trabalho que construí-las já
exigindo. É informação para quem planeja, não ordem a mudar: a ordem dos cards foi mantida.

## Riscos

| risco | de onde vem | o que fazer |
|---|---|---|
| **A feature parar pelos dois conflitos.** Duas decisões humanas contradizem critérios de cards que a mesma pessoa marcou como prontos, em US-1 e em US-4 | Perguntas 9 e 12 contra CA-1.1, CA-4.1 e CA-4.2 | não arbitrar. CA-4.1 e CA-4.2 vão para `Sem tarefa`; CA-1.1 é entregue com a exceção da listagem **declarada em arquivo e nomeada**, para que a decisão fique visível em vez de virar um esquecimento |
| **Reaproveitar como autorização o que não é.** O legado tinha três mecanismos que parecem autorização e não são, e a candidata de arquitetura mais barata é a que mais facilmente os confunde | ADR-0005, ADR-0008 e a marcação de transação somente leitura, separados de propósito em `permissions.md` | T004 declara a matriz em **um** arquivo, e nenhuma tarefa desta feature toca nos três mecanismos. Eles continuam existindo pelos motivos deles |
| **Recusa que vaza existência.** Três critérios pedem a mesma disciplina, e ela é a mais fácil de perder numa mensagem de erro "mais útil" | CA-1.2, CA-2.2, `UT-034-2` | T003 e T006 produzem a recusa num só ponto, e os testes comparam as duas recusas em vez de verificar cada uma isolada |
| **Identidade sem papel tratada como permitida.** É a armadilha clássica, e o legado era o caso extremo: sem regra nenhuma, tudo era permitido | `UT-034-3` | T005 recusa por padrão e permite por declaração, nunca o contrário, e o teste existe para provar isso |
| **Dono anonimizado continuar encontrável.** CA-3.2 alcança todos os caminhos de leitura, e os de busca são de outra feature | CA-3.2 e a feature 002 | T009 cobre explicitamente os caminhos de busca, e isso está dito na tarefa. É o furo mais provável do critério |
| **Dado pessoal em campo livre.** A descrição da visita tem 255 caracteres de texto livre, e nada impede que contenha nome ou telefone | pergunta em aberto da spec | nenhuma tarefa trata. Fica registrado, porque CA-3.2 promete uma coisa que um campo livre pode desmentir, e descobrir isso depois do primeiro pedido de eliminação é o pior momento possível |
| **O inventário de superfícies envelhecer.** CA-1.4 e CA-2.3 pedem teste para **cada** caminho, e um caminho novo criado depois nasce descoberto | os 17 pares enumerados em `permissions.md` | T007 escreve o teste a partir da **lista** de caminhos, não caminho por caminho, de modo que a lista e o teste envelheçam juntos. É a mesma técnica de `UT-017-3` na feature 003 |
