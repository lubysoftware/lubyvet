# Plano, Catálogo de veterinários

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

- **D22/D31** não há rota de dados para sistema externo; o catálogo é servido pela API só ao
  próprio front (`GET /api/vets`, paginado por P-06), sem campo de estado de persistência.
- **P-08** cache Redis do catálogo, invalidado em toda escrita de vocabulário, com TTL de
  segurança de 10 minutos. O nome do cache é uma constante única, nunca um literal repetido.
- **P-07** ordenação por sobrenome e depois nome, ignorando caixa e acento.
- **P-09** só veterinários Ativos aparecem no catálogo público.
- A unicidade de veterinário com especialidade (C4, Pergunta 6) é uma chave primária
  composta na tabela de vínculo.

## Modelo de dados

Entidades desta feature: **Veterinário**, **Especialidade** e o vínculo entre as duas. No
legado eram as tabelas `vets`, `specialties` e `vet_specialties`, a última sem entidade
própria.

### Veterinário

| campo | tipo no legado | obrigatório | muda no modelo novo |
|---|---|---|---|
| `id` | inteiro gerado pelo banco | sim | **não muda.** Pergunta 20 e princípio P4 |
| `first_name` | texto, 30 no H2 e no MySQL, **sem limite** no Postgres | sim na aplicação, **nunca exercitado**, não no banco | nome de coluna declarado (P3), limite nos dois lados com o mesmo número, e a validação passa a ser exercitada por teste (`UT-023-5`) |
| `last_name` | idem | idem | idem |
| `specialties` | coleção, pelo vínculo | não | continua opcional: zero especialidade é caso válido e tem critério próprio (CA-1.3) |
| situação de vínculo | não existia | — | **passa a existir**, decidida nas Perguntas 4 e 17, com o único critério de aceite em CA-2.4 da feature 009 (card REQ-046). A coluna nasce lá, junto do caminho de desligamento; aqui ela é **lida**, para que o desligado não apareça. O conjunto de valores continua sem definição e está em Perguntas em aberto |
| `created_at`, `updated_at` | não existiam | sim | **campos novos**, decisão da Pergunta 12 |

Dois detalhes do legado que não devem ser reproduzidos por inércia. A coleção de
especialidades era **o único campo de coleção do projeto** inicializado sob demanda, o que a
deixava nula até o primeiro acesso. E a ordenação alfabética das especialidades era feita em
memória, no acesso, com um comparador que **lançaria falha se algum nome fosse nulo**,
cenário que o esquema do legado permitia porque a coluna de nome não era obrigatória no banco.
CA-1.2 exige a ordem; o modelo novo a sustenta declarando o nome da especialidade obrigatório
nos dois lados.

### Especialidade

| campo | tipo no legado | obrigatório | muda no modelo novo |
|---|---|---|---|
| `id` | inteiro gerado pelo banco | sim | não muda |
| `name` | texto, 80 no H2 e no MySQL, sem limite no Postgres; **sem restrição de unicidade em dialeto algum** | sim na aplicação, não no banco | passa a ser obrigatório nos dois lados e **único**, pelo mesmo motivo da espécie na feature 003: é o nome que identifica a especialidade para quem lê |

No legado a especialidade **não tinha repositório próprio** e o lado inverso da relação não
era mapeado: ela só era alcançável navegando por um veterinário. Isso pode ser preservado, e
não é dívida: nenhum card pede consulta de especialidade. O que muda é que a feature 009
precisa de um caminho para criá-la.

### O vínculo entre veterinário e especialidade

| coluna | no legado | muda no modelo novo |
|---|---|---|
| veterinário | obrigatória, com restrição de chave estrangeira nomeada em um dialeto e anônima nos outros | restrição nomeada, pelo mesmo motivo da unicidade do nome de animal na feature 003 |
| especialidade | idem | idem |
| unicidade do par | **existia em dois dos três dialetos e faltava no padrão.** É a contradição C4 | **passa a existir, nomeada.** Decisão da Pergunta 6 |

A contradição C4 merece a frase inteira, porque ela explica por que ninguém a descobriria
pelo uso: sob o dialeto padrão o banco aceitava o mesmo par duas vezes, **e a aplicação
escondia a duplicata**, porque a coleção de especialidades não comparava por valor. A
Pergunta 6 também pergunta se há duplicatas a limpar antes de aplicar a restrição, e a
Pergunta 13 responde por tabela vazia: o sistema nunca operou, logo não há nada a limpar. Essa
é a diferença entre esta feature e qualquer migração real, onde aplicar a restrição sem
verificar antes faz a migração falhar.

**Identidade por referência, decidida na Pergunta 21.** A decisão mantém o legado, e a
consequência aqui é precisa: a duplicata do par deixa de ser escondida pela coleção **não**
porque a comparação mudou, mas porque a restrição do banco passa a existir. Se alguém
acrescentar comparação por valor depois, o comportamento não muda, porque não haverá mais
duplicata para esconder.

## Contratos

Operações desta feature, descritas por comportamento. O protocolo depende da stack, que está
em aberto, e por isso nenhuma rota é fixada aqui. O que está fixado é o conjunto de entradas,
saídas e erros, porque isso é contrato pelo princípio P9.

| operação | entrada | saída | erros |
|---|---|---|---|
| Ler o catálogo, página de tela | número de página | os veterinários da página, cada um com nome, sobrenome e especialidades em ordem alfabética, e a marca de ausência quando não tem nenhuma; mais o total de páginas | página fora da faixa **não é erro**: leva à primeira página (CA-2.3). A operação não grava nada (CA-1.4) |
| Ler o catálogo como dados | recorte, quando houver | os veterinários, com os campos de negócio, **sem** nenhum campo de estado interno de persistência | formato diferente do único suportado recebe recusa explícita, nunca resposta malformada (CA-6.2) |

**O que é proibido no contrato, e verificado por teste:** nenhum campo que descreva se a
entidade já passou pelo banco (CA-5.1 e CA-5.2); nenhum segundo formato de resposta (CA-6.1);
nenhuma operação de escrita alcançável pela superfície de leitura (`UT-025-3`, `UT-026-3`).
As três são as proibições que os dois cards de descarte e REG-38 pedem, e estão escritas como
contrato de propósito: uma proibição que não está em arquivo volta na primeira refatoração.

**A superfície de leitura é somente leitura por construção, não por disciplina.** No legado
isso era estrutural: a interface de acesso a dados do catálogo não herdava operação de
escrita nenhuma, e era o ADR-0005. `UT-025-3` exige que continue assim, e a diferença entre
"não escreve" e "não tem como escrever" é a única coisa que sobrevive a um desenvolvedor com
pressa.

**O envelope da resposta de dados é contrato.** No legado o nome do envelope e o campo de
identificador eram provados por teste; os outros campos foram reconstruídos dos acessores
pela análise, e isso está dito em `integrations/integrations.md`. Se US-4 sobreviver à
pergunta sobre o consumidor, o envelope precisa ser fixado por teste de contrato, porque
hoje metade dele é reconstrução.

## Migração de dados

A resposta da Pergunta 13 muda a natureza desta seção: **o sistema nunca operou de verdade,
é demonstração.** Não existe quadro de produção a migrar.

- **O catálogo nasce povoado, e é a exceção da feature.** Os 6 veterinários, as 3
  especialidades e os vínculos entre eles da carga inicial do legado são o único dado desta
  feature, e a análise não encontrou outra fonte. Se o quadro real da clínica existir em
  planilha ou em papel, ele é a verdade, e isso é pergunta para quem opera.
- **A restrição de unicidade do par nasce com a tabela.** Como não há linha, não existe o
  problema que a Pergunta 6 levanta, de limpar duplicatas antes de aplicar a restrição. É o
  inverso de uma migração real.
- **Nada a converter nos nomes.** Os campos de nome e sobrenome do veterinário vinham sem
  limite num dos três dialetos do legado, mas como não há dado, aplicar o limite de 30 não
  trunca nada.
- **O que precisa vir do legado é a regra, não a linha.** A ordem alfabética das
  especialidades, a marca de ausência quando não há nenhuma, as cinco linhas por página e a
  guarda de faixa são comportamento a preservar e estão nos critérios de aceite.

## Sequência

Ordem interna, pelas dependências declaradas nos cards:

1. **US-1 (REQ-023)** abre a feature e não depende de nada. É o único card desta feature sem
   dependência declarada, junto dos dois de descarte.
2. **US-2 (REQ-024)** depende de US-1.
3. **US-3 (REQ-025)** depende de US-1 e pode andar em paralelo com US-2.
4. **US-4 (REQ-026)** depende de US-1, e de uma resposta humana antes de começar.
5. **US-5 (REQ-027)** e **US-6 (REQ-028)** não dependem de card algum. São proibições, e o
   lugar natural delas é **junto de US-4**, porque é a superfície de dados que as viola: uma
   proibição escrita depois da superfície existir custa uma correção, escrita antes custa uma
   linha de teste.

**O que esta feature exige de outras:** a feature 006, pelo catálogo de tradução de que a
marca de ausência de CA-1.3 depende; a feature 009, pelo caminho de escrita do quadro, sem o
qual CA-3.1 não tem o que refletir, **e esse card está bloqueado por decisão humana**, o que
é o maior risco de sequência desta feature.

**O que outras features exigem desta:** a feature 004, em US-4 dela, usaria o catálogo como
origem do responsável do atendimento, e aquele critério está em conflito com a Pergunta 2; a
feature 009 escreve no que esta feature lê; a feature 008 trata a superfície de gestão, que
é onde as estatísticas de memória do catálogo apareceriam.

## Riscos

| risco | de onde vem | o que fazer |
|---|---|---|
| **CA-3.1 não ter o que refletir.** Ela exige que a inclusão de um veterinário apareça na consulta seguinte, e o caminho de inclusão é o card REQ-046, da feature 009, que está bloqueado por decisão humana sobre papéis | dependência entre features, e o bloqueio registrado no backlog | T008 e T009 entregam a invalidação da memória contra um caminho de escrita **de teste**, que é verificável sem a tela de manutenção. O critério fica satisfeito e a tela chega depois, sem retrabalho |
| **A duplicata do par voltar a ser invisível.** Sob o dialeto padrão do legado o banco aceitava e a aplicação escondia, e ninguém descobria pelo uso | contradição C4, Perguntas 6 e 21 | T003 cria a restrição **nomeada** na migração, e T004 testa que o par repetido é recusado pelo banco. A invisibilidade era consequência de duas camadas erradas ao mesmo tempo, e basta corrigir uma |
| **A ordenação implícita devolver conjuntos diferentes para a mesma página.** É assim que um veterinário "desaparece" do quadro sem ter saído | REG-40, que registra ausência de ordenação definida, e CA-2.2 | T006 põe a ordenação no **pedido** ao repositório, não na memória, e `UT-024-2` falha se o pedido não a carregar |
| **Remover o piso de uma página na guarda de faixa.** O redirecionamento de faixa só termina por causa dele, e com catálogo vazio a remoção cria laço infinito | achado do grafo de arquitetura sobre os ciclos 5 e 6, e o único commit do repositório legado | `UT-024-3` cobre o catálogo vazio de propósito, e T006 mantém o piso com comentário de decisão |
| **Reescrever a segunda representação de dados.** Ela tem anotação no código e nenhuma biblioteca que a sustente, e é provável que nunca tenha funcionado | lacuna G1, LAC-UC-03, card REQ-028 | US-6 existe por isso, e é proibição, não trabalho. T012 verifica a recusa explícita, que é a parte que **precisa** existir |
| **O veterinário que saiu continuar anunciado numa página pública.** É a maior exposição da feature | Perguntas 4 e 17, com o critério em CA-2.4 da feature 009 (card REQ-046) | o caminho de desligamento é de lá; aqui T005, T006 e T011 precisam **respeitar** a situação ao montar o catálogo, a paginação e a resposta de dados. Enquanto o conjunto de valores não estiver definido, as três respeitam apenas a distinção entre ativo e desligado, e a pergunta fica aberta na spec |
| **As estatísticas de memória do catálogo.** A análise de arquitetura afirmava que elas eram publicadas, e a etapa de integrações **rebaixou a afirmação**: a configuração pede que sejam habilitadas, e o provedor que as publicaria não está declarado em nenhum dos dois builds do legado | lacuna G3 de `integrations/integrations.md` | nenhum card pede estatística de memória, e nenhuma tarefa a implementa. Fica registrado aqui para que ninguém a trate como comportamento existente a preservar |
