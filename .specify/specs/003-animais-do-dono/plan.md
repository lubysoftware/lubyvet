# Plano, Animais do dono

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

- **D09** situação do animal: Ativo, Falecido, Transferido; só o Administrador volta para
  Ativo.
- **P-10** a espécie é referenciada pelo identificador; a unicidade de nome do animal por dono
  é um índice único em `(owner_id, LOWER(name))`, em SQL cru dentro da migração Prisma.
- O erro de unicidade é reconhecido pelo tipo (`P2002`) e pelo nome da restrição, nunca pelo
  texto da mensagem (P6).
- **P-03** a data de nascimento segue o idioma.
- **D02** autoria; **D16** idempotência.

## Modelo de dados

Entidades desta feature: **Animal** e, como vocabulário consumido, **Espécie**. No legado
eram as tabelas `pets` e `types`.

### Animal

| campo | tipo no legado | obrigatório | muda no modelo novo |
|---|---|---|---|
| `id` | inteiro gerado pelo banco | sim | **não muda.** Decisão da Pergunta 20, e princípio P4 |
| `name` | texto, 30 no H2 e no MySQL, **sem limite** no Postgres; indexado; único por dono | sim na aplicação, **nulável no banco** | nome de coluna passa a ser declarado explicitamente (P3), o limite de 30 passa a existir nos dois lados com o mesmo número, e a coluna passa a ser obrigatória também no banco |
| `birth_date` | data | sim na aplicação, **nulável no banco** | idem: passa a ser obrigatória nos dois lados. O formato de entrada é pergunta em aberto |
| `type_id` | inteiro, referência à espécie, **a única coluna obrigatória do legado além das chaves** | **só na criação** pela aplicação, sempre pelo banco | **a contradição C1 morre aqui.** Decisão da Pergunta 5: obrigatória sempre, declarada em um só lugar (CA-4.3) |
| `owner_id` | inteiro, **nulável**, e sem campo correspondente na entidade | — | **passa a ser obrigatória.** No legado um animal órfão era aceito pelo banco e impossível pela aplicação, e a relação era unidirecional: o animal não sabia quem era o dono dele |
| `version` | não existia | sim | **campo novo**, pelo mesmo motivo do Dono na feature 001, e porque CA-3.3 depende de a edição do animal não arrastar a coleção de visitas |
| `created_at`, `updated_at` | não existiam | sim | **campos novos**, decisão da Pergunta 12: colunas de criação e de alteração, sem autoria |
| situação | não existia | — | **decidida na Pergunta 16 e sem critério de aceite em nenhum card.** Entra como pendência declarada, não como coluna a criar agora. Ver Perguntas em aberto da spec |

**Restrição de unicidade:** o par dono e nome do animal é único, com a comparação ignorando
a caixa. No legado isso existia nos três dialetos, mas com três comportamentos: no H2 a
coluna era de um tipo que ignora a caixa por natureza, no MySQL a restrição era **anônima**,
e no Postgres a coluna não tinha limite de tamanho. A restrição do modelo novo precisa ter
**nome**, porque CA-2.4 exige comportamento idêntico, e precisa ser declarada como
insensível à caixa de propósito, não por consequência do tipo da coluna.

**Relação com o dono:** um dono tem muitos animais. A novidade em relação ao legado não é a
cardinalidade, é a direção: a relação passa a ser navegável também do animal para o dono,
porque CA-5.1 e CA-5.4 precisam comparar o dono informado com o dono real sem carregar a
coleção inteira. O princípio P1 continua valendo: **a navegação existir não autoriza o
acesso por identificador solto**, e é isso que o teste de `UT-017-5` fixa.

### Espécie

| campo | tipo no legado | obrigatório | muda no modelo novo |
|---|---|---|---|
| `id` | inteiro gerado pelo banco | sim | não muda |
| `name` | texto, 80 no H2 e no MySQL, sem limite no Postgres; **sem restrição de unicidade em dialeto algum** | sim | o nome passa a ser único, porque é a chave funcional: o formulário transporta o nome e não o identificador (ADR-0009), e no legado duas espécies "dog" eram possíveis, com a resolução devolvendo a primeira da ordem alfabética |

O vocabulário é controlado por **dados**, não por código: nada no legado conhecia os seis
valores, e trocar a carga inicial trocava as opções do formulário. Isso **se mantém**, e a
manutenção do vocabulário é a feature 009. Esta feature só exige que o conjunto seja fechado
no momento da gravação (CA-1.4).

## Contratos

Operações desta feature, descritas por comportamento. O protocolo depende da stack, que está
em aberto, e por isso nenhuma rota é fixada aqui. O que está fixado é o conjunto de entradas,
saídas e erros, porque isso é contrato pelo princípio P9.

| operação | entrada | saída | erros |
|---|---|---|---|
| Abrir cadastro de animal | identificador do dono | formulário vazio, mais o vocabulário de espécies disponível | dono inexistente, tratado pela feature 008 |
| Cadastrar animal | identificador do dono, nome, data de nascimento, nome da espécie | identificador do animal criado e a ficha do dono | nome ausente ou acima de 30; data de nascimento ausente, futura ou em formato não reconhecido; espécie ausente ou fora do vocabulário; nome já usado por outro animal do mesmo dono. Em todos, nada é gravado e o que foi digitado volta |
| Abrir edição de animal | identificador do dono e do animal | os três campos atuais, a espécie marcada, e a marca de versão | o par dono e animal que não combina responde "não encontrado" (CA-5.1) |
| Alterar animal | identificador do dono e do animal, marca de versão, e os campos a alterar | ficha do dono atualizada | os mesmos erros do cadastro, mais versão vencida. O nome próprio do animal **não** conta como duplicata (CA-2.5) |
| Resolver espécie pelo nome | nome da espécie, como texto | a espécie do vocabulário | nome fora do vocabulário vira erro **no campo de espécie**, nunca falha de conversão vazando para a tela |

**Nomes de campo são contrato.** No legado os nomes de campo do formulário de animal não
estavam no código do controller, estavam nos parâmetros dos fragmentos de template
(`createOrUpdatePetForm.html:20-22`), de modo que renomear um parâmetro de fragmento mudava o
contrato HTTP sem tocar em um único arquivo de código. O princípio P9 proíbe isso: nome de
campo de formulário é declarado em arquivo e fixado por teste de contrato.

**A espécie trafega pelo nome, não pelo identificador.** É o ADR-0009 do legado, e o card o
mantém. A consequência a registrar no contrato é que renomear uma espécie no vocabulário
muda o valor que o formulário envia, e por isso a feature 009 precisa saber disso.

## Migração de dados

A resposta da Pergunta 13 muda a natureza desta seção: **o sistema nunca operou de verdade,
é demonstração.** Não existe base de produção de animais a migrar.

- **Animal nasce vazio.** Os 13 animais da carga inicial do legado são úteis apenas como
  massa de teste.
- **Espécie nasce povoada.** O vocabulário de seis valores é a única coisa desta feature que
  **precisa** vir do legado, porque é dado de referência e está citado em REG-23. A carga
  inicial dos seis valores é tarefa desta feature; a manutenção posterior é da feature 009.
- **A restrição de unicidade nasce com a tabela.** Como não há base, não existe o problema
  de aplicar a restrição sobre dado já duplicado. Isso é o inverso do que acontece na feature
  005, onde a mesma pergunta tem resposta diferente.
- **O que precisa vir do legado é a regra, não a linha.** O limite de 30 caracteres, a
  recusa de data futura, a unicidade por dono ignorando a caixa e a obrigatoriedade da
  espécie são comportamento a preservar e estão nos critérios de aceite.

## Sequência

Ordem interna, pelas dependências declaradas nos cards:

1. **US-1 (REQ-013)** abre a feature. O card declara dependência de REQ-006, que é a ficha do
   dono, US-6 da feature 001: sem ela não há onde terminar a escrita (REG-47).
2. **US-2 (REQ-014)** depende de US-1.
3. **US-3 (REQ-015)** depende de US-1 e pode andar em paralelo com US-2.
4. **US-4 (REQ-016)** depende de US-3.
5. **US-5 (REQ-017)** depende de US-3, e é o único item desta feature que também atende a
   feature 004: CA-5.2 cobre o caminho de agendamento de visita, que é de lá.

**O que esta feature exige de outras:** a feature 001, pelo Dono modelado e migrado e pela
ficha que é o destino de toda escrita; a feature 009, pelo vocabulário de espécies, mas só
para a manutenção dele, porque a carga inicial é desta feature; a feature 006, pelo catálogo
de tradução de que CA-1.2 e CA-2.1 dependem.

**O que outras features exigem desta:** a feature 004 inteira, porque a visita se pendura no
animal; a feature 007, porque a anonimização do dono precisa saber o que acontece com os
animais dele; a feature 008, que trata o "não encontrado" cujo resultado CA-5.1 fixa.

## Riscos

| risco | de onde vem | o que fazer |
|---|---|---|
| **A verificação preventiva de nome duplicado deixa de rodar sem nenhum sinal.** No legado a condição que a disparava era "o animal ainda não passou pelo banco". Com identificador atribuído pela aplicação, ela nunca mais é verdadeira, a regra cai de três camadas para uma e nada falha | nota do Revisor na Pergunta 20, e princípio P4 da constituição | T006 e T007 separam a verificação preventiva da restrição de banco e cada uma tem teste próprio, que nomeia a dependência. Trocar o tipo da chave é item 7 do Não negociável |
| **Reconhecer violação de unicidade pelo texto da exceção.** É a contradição C2, de gravidade alta: num dos dialetos do legado a restrição era anônima e o usuário recebia falha de sistema em vez da mensagem de nome em uso | contradição C2 de `domain.md` §3, e CA-2.4 | T008 reconhece pelo tipo do erro e tem teste com os dois formatos de mensagem, um com nome de restrição e outro anônimo (`UT-014-4`) |
| **CA-2.3 e CA-2.4 não são verificáveis por teste de unidade.** A corrida real entre dois processos sobre o mesmo banco exige teste de integração, e o comportamento idêntico entre dialetos exige mais de um banco | achado de QA do card REQ-014, idêntico ao de REQ-005 na feature 001 | T009 é teste de integração e isso está dito nela. Compartilha a infraestrutura com T016 da feature 001 |
| **O isolamento entre donos volta a ser acidental.** Substituir a resolução pelo dono por uma busca direta por identificador é uma refatoração de desempenho plausível, e no legado a suíte inteira continuaria verde | Pergunta 23, princípio P1 | US-5 existe por isso. T013 escreve o teste **antes** de T014, e `UT-017-5` falha especificamente quando a resolução deixa de passar pelo dono |
| **A espécie vazia na edição não é alcançável pela tela.** Quem escrever só teste de interface não cobre o caminho que produzia a falha de sistema | nota do Revisor na Pergunta 5 | T011 testa a **requisição**, não o formulário renderizado, e isso está dito na tarefa |
| **O animal falecido fica na ficha para sempre.** Sem campo de situação e sem exclusão, ele continua ao lado dos vivos e não há como corrigir pela aplicação | Perguntas 4 e 16, sem critério de aceite em card algum | não inventar. O campo está no modelo de dados como pendência declarada e a pergunta está em aberto na spec. Quando a decisão vier, ela atinge CA-1.5, CA-2.1 e a leitura da ficha |
| **Duas espécies que diferem só pela caixa.** O legado não tinha restrição de unicidade no nome da espécie, e a resolução devolvia a primeira da ordem alfabética | achado do dicionário de dados sobre `types`, e `UT-013-7` | T003 declara o nome da espécie como único e a resolução como insensível à caixa, com os dois lados coerentes. O caso só se torna observável quando a feature 009 permitir cadastrar espécie |
