# Plano, Agenda e atendimento de visitas

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

- **D10** Agendada → Realizada | Cancelada | Não compareceu; os três são finais; cancelar
  só antes da data.
- **D11** nenhum processo muda estado com o tempo; "pendente de registro" é derivado na
  leitura.
- **D06** atendimento com data passada ou de hoje; data futura é recusada.
- **D01** veterinário opcional no atendimento, só entre os ativos (P-09).
- **D09** animal Falecido ou Transferido não aceita agendamento novo.
- **D12** porta `NotificacaoAoDono`: a gravação do agendamento publica no RabbitMQ (outbox na
  mesma transação, para não perder a mensagem se a fila estiver fora); um consumidor envia
  pela Meta Cloud API com retentativa e fila de descarte; um `CronJob` diário publica os
  lembretes de D-1. O adaptador falso (log) é o padrão; homologação usa o número de teste da Cloud API e
  produção espera a conta verificada (D28). Templates sem botões, sem webhook (D28);
  `CronJob` às 10:00 de `America/Sao_Paulo` (D29).
- **D26** campos do atendimento: queixa principal, peso, diagnóstico, conduta, retorno e
  veterinário opcional.
- O relógio é uma porta (`Relogio`) injetada, para que os testes controlem a data.

## Modelo de dados

A Pergunta 1 decidiu **separar agendamento e atendimento em duas entidades**. No legado havia
uma só, a tabela `visits`, com duas colunas de conteúdo e nenhuma de situação.

### O que o legado tinha

| campo | tipo no legado | obrigatório | observação |
|---|---|---|---|
| `id` | inteiro gerado pelo banco | sim | não muda. Pergunta 20 e princípio P4 |
| `visit_date` | data | **não** na aplicação, não no banco | é a **única** coluna do sistema com nome declarado explicitamente, e a única entidade com valor padrão em construtor: toda visita nascia marcada para amanhã |
| `description` | texto, 255 no H2 e no MySQL, **sem limite** no Postgres | sim na aplicação, não no banco | — |
| `pet_id` | inteiro, **nulável**, e sem campo correspondente na entidade | — | mesma assimetria de `pets.owner_id`: a visita não sabia de que animal era |

Dois detalhes do legado que precisam morrer com nome, para que ninguém os reproduza por
inércia: a data **não tinha obrigatoriedade na aplicação**, de modo que uma data vazia
submetida escapava da regra de faixa, que só agia quando a data existia, e era gravada como
nula; e a visita **não tinha vínculo com veterinário em nenhum dos três esquemas**, o que é a
razão pela qual CA-4.4 não tem resposta possível no modelo velho.

### O que o modelo novo precisa ter

**Agendamento.** É a entidade que US-1, US-2, US-3 e US-5 manipulam.

| campo | obrigatório | de onde vem |
|---|---|---|
| identificador | sim | inteiro gerado pelo banco, princípio P4 |
| animal | sim | **passa a ser obrigatória**. No legado a coluna era nulável e a visita órfã era aceita pelo banco |
| data | sim | **passa a ser obrigatória na aplicação**, fechando o caminho da data nula. A faixa aceitável é US-3 e está em aberto |
| descrição | sim, até 255 | REG-27, com o limite nos dois lados e o mesmo número (princípio P3) |
| situação | sim | **campo novo**, exigido por CA-4.1 e CA-5.2. Os valores e as transições são pergunta em aberto |
| data de cada mudança de situação | sim | **campo ou tabela nova**, exigido por CA-4.1 e CA-5.3. `UT-021-1` exige que a mudança registre a data **sem perder a anterior**, o que empurra para um registro de histórico de situação e não para uma coluna só |
| versão | sim | pelo mesmo motivo das features 001 e 003 |
| criação e alteração | sim | decisão da Pergunta 12 |

**Atendimento.** É a entidade que US-4 cria, e a que carrega o conflito.

| campo | obrigatório | de onde vem |
|---|---|---|
| identificador | sim | princípio P4 |
| agendamento de origem | indefinido | um atendimento retroativo (CA-3.2) pode não ter agendamento nenhum. Isso precisa estar decidido antes de a tabela existir |
| animal | sim | é o que CA-4.4 consulta |
| data do atendimento | sim | aceita hoje e retroativo, ao contrário do agendamento (CA-3.1, CA-3.2) |
| veterinário responsável | **em conflito** | CA-4.2 exige. A Pergunta 2 proíbe. Ver Perguntas em aberto da spec. Enquanto o conflito existir, a coluna **não é criada** |
| desfecho | indefinido | decidido na Pergunta 3, sem critério de aceite em card algum. Fica como pendência declarada |
| criação e alteração | sim | Pergunta 12 |

**A alternativa de uma tabela só**, com situação distinguindo agendado de atendido, satisfaz
literalmente CA-4.1 ("uma visita passa a ter situação") e é mais barata. A Pergunta 1 decidiu
contra, e a razão prática aparece em CA-3.1 e CA-3.2 contra REG-28: a mesma linha teria de
recusar data passada quando é compromisso e aceitar quando é registro, o que é exatamente o
tipo de regra dupla numa só camada que o princípio P6 proíbe. O plano segue a decisão humana.

**Relação com o animal:** um animal tem muitos agendamentos e muitos atendimentos. A
navegação do agendamento para o animal passa a existir, pelo mesmo motivo da feature 003:
CA-5.2 de lá cobre o caminho de agendamento, e a resolução tem de passar pelo dono.

**Notificação ao dono:** não tem entidade nesta feature, porque nenhum card a sustenta. O que
o plano registra é que ela precisa de **destinatário**, e o e-mail do dono é pendência da
feature 001, também sem critério de aceite.

## Contratos

Operações desta feature, descritas por comportamento. O protocolo depende da stack, que está
em aberto, e por isso nenhuma rota é fixada aqui. O que está fixado é o conjunto de entradas,
saídas e erros, porque isso é contrato pelo princípio P9.

| operação | entrada | saída | erros |
|---|---|---|---|
| Abrir agendamento | identificador do dono e do animal | formulário com a data sugerida preenchida, o primeiro dia aceitável declarado no campo, e o histórico de visitas do animal | o par dono e animal que não combina responde "não encontrado" (CA-5.1 da feature 003) |
| Agendar visita | identificador do dono e do animal, data, descrição | o agendamento criado e a ficha do dono | descrição ausente ou acima de 255; data ausente; data fora da faixa, com mensagem **no campo de data**. Em todos, nada é gravado e o que foi digitado volta |
| Remarcar agendamento | identificador do agendamento, versão, data e descrição novas | o agendamento atualizado e a ficha do dono | agendamento já atendido recusa a remarcação (CA-5.1 e `UT-022-4`); versão vencida; os mesmos erros de validação do agendamento |
| Cancelar agendamento | identificador do agendamento, versão | o agendamento com situação de cancelado e a data da mudança | agendamento já atendido recusa o cancelamento. **Nenhuma exclusão é solicitada ao repositório** (`UT-022-5`) |
| Registrar atendimento | identificador do animal, data, e o responsável quando o conflito de US-4 for resolvido | o atendimento criado e a situação do agendamento de origem, quando houver | data fora da janela de retroatividade; responsável fora do catálogo (CA-4.2); agendamento já atendido |
| Consultar atendimentos de um veterinário | identificador do veterinário | os animais atendidos por ele, **sem repetição** | depende da resolução do conflito de US-4 |
| Ler histórico de visitas do animal | identificador do dono e do animal | as visitas em ordem crescente de data, com data e descrição, **sem** a visita em preparação, e com a situação de cada uma | animal sem visita devolve seção vazia com mensagem de ausência, não erro (CA-2.3) |

**A faixa de data é contrato de um só lugar.** CA-1.4, CA-3.3, `UT-018-7` e `UT-020-3` dizem a
mesma coisa por quatro caminhos: o limite declarado no campo do formulário e o limite que a
validação recusa têm de ser o **mesmo dia**, de modo que mudar a regra num lugar e esquecer o
outro quebre um teste. No legado os três lugares eram coerentes, mas por coincidência de
redação, e não havia teste que ligasse um ao outro.

**O rótulo da seção é contrato.** CA-2.4 é o único critério de todo o pacote que fixa a
**coerência entre um texto visível e o recorte de dados que ele descreve**: ou o recorte
exclui as futuras e o rótulo fala de visitas anteriores, ou as duas aparecem e o rótulo fala
de histórico. A combinação contrária é o que `UT-019-4` reprova.

## Migração de dados

A resposta da Pergunta 13 muda a natureza desta seção: **o sistema nunca operou de verdade,
é demonstração.** Não existe agenda de produção a migrar.

- **Agendamento e atendimento nascem vazios.** As 4 visitas da carga inicial do legado são
  úteis apenas como massa de teste, e trazem um detalhe revelador que vale conhecer: são
  todas de datas passadas, **dados que a própria aplicação recusaria na entrada**. Isso é o
  indício mais direto, em todo o repositório, de que a recusa de data não futura não era
  pensada para a vida real.
- **Nada vem do legado nesta feature.** Nem dado de referência: ao contrário da espécie na
  feature 003, não há vocabulário a preservar.
- **As situações nascem com a tabela.** Como não há linha a converter, não existe o problema
  de decidir em que situação uma visita antiga entra. Em compensação, a decisão sobre o
  conjunto de situações não tem nada que a force a ser compatível com o passado, e por isso
  ela é inteira uma pergunta em aberto.
- **O que precisa vir do legado é a regra, não a linha.** O limite de 255 caracteres, a ordem
  crescente de data, o descarte da visita em branco e a existência de uma faixa de data
  declarada num só lugar são comportamento a preservar e estão nos critérios de aceite.

## Sequência

Ordem interna, pelas dependências declaradas nos cards:

1. **US-1 (REQ-018)** abre a feature. O card declara dependência de REQ-013, que é o cadastro
   de animal, US-1 da feature 003.
2. **US-2 (REQ-019)** depende de US-1.
3. **US-3 (REQ-020)** depende de US-1 e pode andar em paralelo com US-2.
4. **US-4 (REQ-021)** depende de US-3.
5. **US-5 (REQ-022)** depende de US-4.

A cadeia é linear e os três últimos elos eram, no backlog, os três cards bloqueados. Duas
consequências práticas: a feature **entrega valor em US-1 e US-2** mesmo que o conflito de
US-4 não seja resolvido, e US-5 fica atrás de US-4 pelo card, embora a remarcação e o
cancelamento de um agendamento não dependam tecnicamente do registro de atendimento. A ordem
dos cards foi mantida porque quem a escreveu olhou o sistema; se o conflito de US-4 demorar,
vale perguntar a quem decide se US-5 pode andar antes.

**O que esta feature exige de outras:** a feature 003, pelo Animal e pela resolução que passa
pelo dono; a feature 001, pela ficha que é o destino de toda escrita; a feature 006, pelo
catálogo de tradução de que CA-1.3, CA-2.3 e CA-3.2 dependem; a feature 005, pelo catálogo de
veterinários de que CA-4.2 dependeria, se o conflito for resolvido em favor do vínculo.

**O que outras features exigem desta:** a feature 001, pela paginação do histórico de visitas
dentro da ficha do dono, que lê o que esta feature grava; a feature 007, porque a anonimização
do dono precisa saber o que acontece com o histórico de visitas dos animais dele, e CA-5.3
mais o princípio P2 já respondem metade: o registro permanece.

## Riscos

| risco | de onde vem | o que fazer |
|---|---|---|
| **A feature parar inteira pelo conflito de US-4.** Duas pessoas decidiram coisas opostas sobre o veterinário na operação, e US-5 está atrás de US-4 na cadeia de dependências dos cards | Pergunta 2 contra CA-4.2 e CA-4.4 | não arbitrar. Os dois critérios vão para a seção `Sem tarefa` de `tasks.md`, com o conflito escrito, e nenhuma tarefa cria a coluna de responsável. CA-4.1 e CA-4.3, que não dependem do veterinário, seguem, e US-1, US-2, US-3 e US-5 seguem inteiras |
| **"Realizada" continuar sendo estado fantasma.** Se nada observa o relógio, uma visita passada e não registrada fica agendada para sempre, que é a lacuna que esta feature existe para fechar | máquina EM-03 de `state-machines.md`, e a ausência provada de agendador, fila e evento no legado | pergunta em aberto da spec. T006 declara a faixa de data num só lugar, o que é pré-requisito de qualquer resposta, e nenhuma tarefa inventa o ator do tempo |
| **A data nula escapar da validação de faixa.** No legado a regra só agia quando a data existia, e a data não era obrigatória, de modo que vazio era gravado | achado do dicionário de dados sobre `visits` | T003 declara a data obrigatória nos dois lados, T005 a recusa na validação e T008 testa o vazio junto com o fora de faixa |
| **O relógio do sistema entrar nos testes.** 14 dos 26 testes desta feature dependem de "amanhã", "hoje" ou "o primeiro dia aceitável" | os `given` dos próprios testes dos cards, que pedem relógio controlado | T002 entrega o relógio injetável antes de qualquer regra de data, e nenhuma tarefa posterior usa o relógio do sistema |
| **Reproduzir o valor padrão no construtor.** No legado toda visita nascia marcada para amanhã, dentro do construtor da entidade, e era a única entidade do sistema com valor padrão ali | achado do dicionário de dados, e ADR-0003 | T006 põe a data sugerida na **preparação do formulário**, não no construtor: `UT-020-2` exige que ela seja o primeiro dia que a regra em vigor aceita, e uma regra em vigor que muda não pode depender de um construtor |
| **A seção de histórico mentir o próprio nome.** É o caso que a análise não conseguiu arbitrar sem executar a aplicação, e o único em que cinco etapas se pronunciaram | BUG-UI-05 contra D-DET-03 | CA-2.4 e `UT-019-4` transformam a divergência em teste. T009 e T010 entregam o recorte e o rótulo juntos, de propósito |
| **A notificação ao dono aparecer no meio da implementação.** Ela foi decidida por uma pessoa, não tem card, e é a única pendência do pacote que cria integração externa | Pergunta 3, e a premissa de integração zero que descartou seis arquiteturas | está em Fora de escopo e em Perguntas em aberto, e a nota da seção Stack avisa quem decide a arquitetura. Nenhuma tarefa a implementa |
