# Plano, Vocabulários do domínio

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

- **D18** só o Administrador mantém os vocabulários.
- **P-09** veterinário Ativo ou Desligado, com reativação; **P-10** espécie Ativa ou Inativa,
  referenciada pelo identificador; **P-11** especialidade mantida pelo Administrador.
- A superfície administrativa mora na mesma aplicação, sob `/admin`. A invalidação do cache do
  catálogo (P-08) é uma chamada à porta de cache dentro do caso de uso de escrita.
- O vocabulário continua dirigido por dados: nunca vira enumerado em código.
- **D01** desligar um veterinário preserva os atendimentos já registrados com ele;
  `UT-046-4` agora é executável.

## Modelo de dados

Esta feature **não cria entidade nova**. Ela cria caminhos de escrita para três entidades que
as features 003 e 005 já modelam, e acrescenta a elas uma coisa que o legado não tinha:
situação.

### Espécie, modelada na feature 003

| campo | muda aqui |
|---|---|
| `name` | já nasce **único** e com resolução insensível à caixa, por T003 da feature 003. `UT-045-6` confirma pelo outro lado: incluir o mesmo nome com outra caixa é recusado como repetido, em vez de criar uma sétima espécie equivalente |
| situação | **campo novo, criado aqui.** `UT-045-7` exige que uma espécie possa ser retirada do uso **sem ser apagada**: ela sai das opções do formulário e continua existindo para o histórico. O conjunto de valores não está definido em lugar algum e está em Perguntas em aberto |

**O vínculo do animal com a espécie é por identificador**, e é só por isso que CA-1.2 é
possível: renomear a espécie não desvincula nenhum animal. O nome é chave funcional apenas no
formulário (ADR-0009), e a consequência de renomear é **mudar o valor que o formulário envia**.

### Veterinário, modelado na feature 005

| campo | muda aqui |
|---|---|
| `first_name`, `last_name` | as validações, que no legado existiam e **nunca eram exercitadas** por não haver formulário, passam a ser exercitadas de verdade: `UT-046-6` exige recusa com erro no campo que falta |
| situação de vínculo | **campo novo, criado aqui**, decidido nas Perguntas 4 e 17. É esta feature que cria a coluna e o caminho de desligamento; a feature 005 apenas a **lê**, para que o desligado não apareça no catálogo |
| `specialties` | continua opcional, zero ou mais. `UT-046-7` exige que o veterinário com zero especialidade seja gravado e receba, no catálogo, a marca de ausência |

### O vínculo veterinário e especialidade

A restrição de unicidade **nomeada** do par já nasce na migração de T003 da feature 005, pela
decisão da Pergunta 6. Esta feature é a que a exercita: no legado não havia caminho de escrita,
então a restrição existia em dois dialetos sem nunca ser testada por uso. `UT-046-3` é o
primeiro teste da história deste sistema que tenta atribuir o par duas vezes.

**Por que a duplicata era invisível, e por que corrigir só um lado basta.** Sob o dialeto padrão
o banco aceitava o par repetido **e** a estrutura de dados da aplicação absorvia a duplicata na
leitura, porque não comparava por valor. A Pergunta 21 decidiu manter a identidade por
referência, ou seja, a segunda camada continua como era: a correção vem da restrição, não da
comparação, e isso é suficiente porque não haverá mais duplicata para esconder.

## Contratos

| operação | entrada | saída | erros |
|---|---|---|---|
| Incluir espécie | nome | a espécie criada, imediatamente disponível para escolha no cadastro de animal | nome repetido, **inclusive com outra caixa**, é recusado como repetido (`UT-045-6`); nome em branco é recusado |
| Renomear espécie | identificador, nome novo | a espécie com o nome novo, e os animais vinculados intactos | nome novo repetido é recusado. **Renomear muda o valor que o formulário envia**, e isso é consequência a conhecer, não erro |
| Remover espécie em uso | identificador | — | **sempre recusado**, com explicação do motivo, e a espécie continua no vocabulário (CA-1.3) |
| Retirar espécie do uso | identificador | a espécie fora das opções do formulário, **ainda existente** | nenhuma exclusão é solicitada ao repositório (`UT-045-7`) |
| Incluir veterinário | nome, sobrenome, e zero ou mais especialidades | o veterinário criado, e o catálogo atualizado na consulta seguinte | nome ou sobrenome ausente é recusado no campo que falta; par de especialidade repetido é recusado |
| Alterar especialidades de um veterinário | identificador, e o conjunto novo | o veterinário com **exatamente** o conjunto novo | par repetido é recusado |
| Desligar veterinário | identificador | o veterinário fora do catálogo, com a linha preservada | nenhuma exclusão é solicitada ao repositório (`UT-046-8`) |

**A superfície de escrita é separada da superfície de leitura, e isso é contrato.** O legado
garantia a impossibilidade de escrever **por construção**: a interface de acesso a dados do
catálogo não herdava operação de escrita nenhuma (ADR-0005). Esta feature troca o mecanismo de
garantia, não o abandona: a superfície de leitura continua sem operação de escrita, verificada
por `UT-025-3` e `UT-026-3` da feature 005, e a escrita vive numa superfície administrativa
própria. Acrescentar escrita na mesma interface que a tela pública usa satisfaria os critérios
desta feature **e quebraria os de lá**, sem que nada avisasse.

**Nada é apagado, em nenhuma das duas histórias.** REG-41 e o princípio P2 da constituição
valem aqui com a mesma força da anonimização da feature 007, e dois testes os cobrem por
observação direta: `UT-045-7` e `UT-046-8` usam um repositório que **registra toda exclusão
recebida** e exigem que a contagem seja zero.

## Migração de dados

A resposta da Pergunta 13 vale aqui: **o sistema nunca operou de verdade, é demonstração.** Mas
esta é a feature em que o dado de referência do legado tem mais valor, e vale separar o que vem
de onde:

- **Os seis valores de espécie vêm**, e a carga inicial deles é tarefa da feature 003, não
  desta. Aqui eles são o ponto de partida que US-1 passa a poder alterar.
- **Os seis veterinários e as três especialidades vêm**, e a carga inicial deles é da
  feature 005. Mesma divisão.
- **Nada precisa de conversão**, porque a situação é campo novo e todo registro existente nasce
  ativo.
- **Se o quadro real da clínica existir fora do sistema**, em planilha ou em papel, ele é a
  verdade e esta feature é a tela por onde ele entra. Isso é pergunta para quem opera, e está
  registrada no `plan.md` da feature 005.
- **O que esta feature elimina não é dado, é um procedimento:** acrescentar uma espécie ou um
  veterinário deixa de exigir acesso direto ao banco de dados. A análise registrou a ausência
  como caso de uso faltante, LAC-UC-10, e o custo dela não estava no banco: estava em quem
  precisava de credencial de banco para atender um paciente de espécie nova.

## Sequência

Ordem interna, pelas dependências declaradas nos cards:

1. **US-1 (REQ-045)** depende de REQ-033, que é US-1 da feature 007.
2. **US-2 (REQ-046)** depende de REQ-033 e de REQ-025, que é US-3 da feature 005.

As duas histórias são independentes entre si e podem andar em paralelo. A ordem relativa não
importa; o que importa é que **as duas estão atrás de duas outras features**.

**O que esta feature exige de outras:** a feature 007, por identidade, porque manutenção de
vocabulário é ação administrativa e sem identificação ficaria aberta a qualquer um, e é esse o
bloqueio que os dois cards registram; a feature 003, pela Espécie modelada e carregada; a
feature 005, pelo Veterinário modelado, pela restrição nomeada do par e pela memória do
catálogo que CA-2.5 invalida.

**O que outras features exigem desta:** a feature 005, em CA-3.1 de lá, que exige que a
inclusão de um veterinário apareça na consulta seguinte e **não tem o que refletir** sem esta
feature; a feature 003, que consome o vocabulário que esta mantém.

**Consequência prática da posição na fila.** Esta é a última feature na ordem de dependências
de todo o pacote, e é também a que destrava um critério de uma feature anterior. Vale saber
disso ao planejar: CA-3.1 da feature 005 é verificável antes, contra um caminho de escrita de
teste, e isso está dito em T010 de lá. O caminho de verdade chega aqui, sem retrabalho.

## Riscos

| risco | de onde vem | o que fazer |
|---|---|---|
| **Abrir escrita na superfície de leitura.** É o caminho mais curto para satisfazer os critérios desta feature, e ele quebra dois critérios da feature 005 sem que nada avise | REG-38, ADR-0005, `UT-025-3` e `UT-026-3` da feature 005 | T002 e T006 criam uma superfície administrativa **própria**, e as duas tarefas dizem isso. A verificação que protege está na feature 005 e precisa continuar verde depois desta |
| **CA-2.4 não ter sujeito.** "O histórico que o menciona" só existe se a visita registrar quem atendeu, e isso é o conflito de US-4 da feature 004 | Pergunta 2 contra CA-4.2 da feature 004 | T008 entrega a primeira metade, o desligado saindo do catálogo com a linha preservada. `UT-046-4` não tem como ser montado enquanto o conflito durar, e isso está dito na tarefa |
| **Renomear espécie quebrar o formulário.** O nome é a chave funcional do formulário (ADR-0009), e renomear muda o valor que ele envia | CA-1.2, CA-1.4, ADR-0009 | T004 renomeia pelo identificador e T005 resolve a escolha **sem exigir grafia exata**, inclusive com espaços nas pontas. Os dois juntos fazem a renomeação ser invisível para quem usa |
| **Duas espécies equivalentes com caixas diferentes.** O legado não tinha restrição de unicidade no nome da espécie e a resolução devolvia a primeira da ordem alfabética | achado do dicionário de dados sobre o vocabulário de espécies, `UT-045-6` | a restrição nasce em T003 da feature 003. T003 daqui exercita o outro lado: a inclusão repetida é recusada |
| **Apagar em vez de retirar do uso.** É o erro mais provável das duas histórias, porque "remover" é o verbo natural de uma tela de manutenção | REG-41, ADR-0007, princípio P2, `UT-045-7` e `UT-046-8` | os dois testes usam um repositório que **registra toda exclusão recebida** e exigem contagem zero. Nenhuma tarefa desta feature chama exclusão |
| **A memória do catálogo não ser invalidada por este caminho.** CA-2.5 e CA-3.1 da feature 005 são o mesmo requisito visto dos dois lados, e a invalidação pode acabar ligada só ao caminho de teste | CA-2.5, e T009 da feature 005 | T008 liga **as três** escritas de veterinário, inclusão, alteração e desligamento, ao descarte da memória, e `UT-046-5` conta um descarte por escrita |
| **Virar o vocabulário em código.** Transformar as espécies num enumerado é uma simplificação plausível e mataria US-1 por inteiro | decisão de stack número 4, e o desenho do legado, que era controlado por dados | está na seção Stack como decisão a tomar antes de começar. Nenhuma tarefa desta feature pressupõe o contrário, e se o enumerado for escolhido, a feature não existe |
| **Tratar manutenção de vocabulário como escrita comum.** Com dois papéis só, quem cadastra um dono também renomeia espécie e desliga veterinário | Pergunta 8, que fixou dois papéis | pergunta em aberto da spec. T002 e T006 declaram a permissão exigida **na superfície administrativa**, de modo que trocá-la por um terceiro papel seja uma linha na matriz de T004 da feature 007 |
