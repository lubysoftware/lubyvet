# Pacote de especificações, spring-petclinic

> **Atualização de 2026-10-07.** A stack foi decidida e os conflitos e as perguntas que travavam
> critério foram respondidos em `memory/decisoes.md`, que prevalece sobre este README. Onde o
> texto abaixo diz que a stack não está decidida ou que um conflito não foi arbitrado, ele
> descreve o estado de 2026-10-06.

> Gerado em **2026-10-06** a partir da engenharia reversa em `_reversa_sdd/`.
> Formato [Spec Kit](https://github.com/github/spec-kit): constituição, spec, plano e tarefas.
> Idioma dos artefatos: Português. Nível de documentação: `detalhado`.

## 1. O que é este pacote e de onde veio

O sistema analisado é o **spring-petclinic**, um monólito web de clínica veterinária renderizado
no servidor: 7 tabelas, 6 entidades, 17 pares de método e rota sobre 12 rotas distintas, uma
única integração de runtime, que é o banco de dados, e um único ator humano, não identificado
de forma alguma.

Este pacote **não é documentação do sistema velho**. Ele é o contrato do que será construído num
projeto **novo**, vazio, por alguém que vai abrir um agente de codificação e mandar executar.
Nada aqui descreve como o legado era organizado, exceto onde isso explica por que uma regra
existe ou por que uma decisão precisa ser tomada.

| | |
|---|---|
| Cards no kanban | **49** |
| Cards selecionados, em `pronto` | **49** |
| Cards excluídos | **0** |
| Features geradas | **10** |
| Histórias de usuário | **49**, uma por card |
| Critérios de aceite | **166** |
| Critérios **sem tarefa** | **15**, cada um com o motivo escrito |
| Tarefas | **145** |
| Princípios da constituição | **9**, mais 8 itens não negociáveis |
| Perguntas em aberto | **56** |

**De onde vem o conteúdo.** A seleção veio de `backlog/kanban.json`, que registra a coluna
efetiva de cada card depois das movimentações feitas na tela do Studio. O conteúdo dos cards e
os épicos vieram de `backlog/backlog.json`. A constituição veio de `soul.md`, `domain.md` e
`permissions.md`. Os cenários de aceite vieram dos cards, que por sua vez vieram de
`use-cases/use-cases.json`. As 26 respostas humanas de `questions.md` atravessam todas as
features e estão citadas por número onde incidem.

**A stack não está decidida, e este pacote não a escolhe.** `refactor/decision.json` e
`refactor/tech-stack.json` não existem no resultado da análise: ninguém marcou uma arquitetura
como escolhida e não há candidatos de tecnologia pesquisados por slot. Cada `plan.md` traz as
três candidatas que a análise levantou, com o ajuste medido de cada uma, as seis que ela
descartou, e **a lista das decisões de stack que precisam estar tomadas antes de a feature
começar**. Escolher a stack é o item 4 do Não negociável da constituição.

## 2. Como usar

1. **Copie a pasta `speckit/` para a raiz do projeto novo.** Ela é autocontida: nenhuma
   referência deste pacote aponta para fora dele, exceto as citações de arquivos do legado e da
   análise na rastreabilidade de cada spec, que existem para conferir uma afirmação na fonte.
2. **Leia `memory/constitution.md` inteiro, antes de qualquer coisa.** São 9 princípios, cada um
   com a regra, o motivo e **como conferir** que uma mudança não o violou, mais 8 itens que
   exigem decisão humana e diante dos quais o agente de codificação para e pergunta.
3. **Tome as decisões de stack.** Abra o `plan.md` da primeira feature que você vai fazer e leia
   a seção `Stack`. Ela lista o que precisa estar decidido antes da primeira linha de código.
   Quatro decisões aparecem em quase todas as features: qual arquitetura, **qual dialeto de
   banco é a verdade**, qual é o build canônico e de onde vem a identidade.
4. **Pegue uma feature e execute `tasks.md` na ordem.** Cada tarefa diz o que entrega e qual
   critério de aceite ela satisfaz. Tarefa marcada com `[P]` pode rodar em paralelo com a
   anterior por tocar arquivos diferentes.
5. **Confira o `spec.md` da feature ao fechar.** Os critérios de aceite são a definição de
   pronto. Os que estão na seção `Sem tarefa` do `tasks.md` **não** fazem parte do pronto, e o
   motivo está escrito lá.
6. **Não resolva as perguntas em aberto por conta própria.** Elas estão na seção 5 deste arquivo
   e na spec de cada feature. Decidir uma delas em silêncio é a forma mais barata de transformar
   este pacote num pacote que parece completo e não é.

**Uma observação sobre os três conflitos.** Três critérios de aceite deste pacote contradizem
uma resposta humana registrada em `questions.md`. Eles estão nas features 004, 007 e 008, e em
nenhum dos três casos o pacote arbitrou. O item 6 do Não negociável da constituição descreve um
deles; os outros dois são da mesma natureza. Se você for o árbitro, a seção 5 começa por eles.

## 3. Ordem sugerida entre as features

### A ordem obrigatória, pelas dependências dos cards

Os `depends_on` dos cards produzem quatro níveis. Dentro de um nível, as features são
independentes entre si e podem andar em paralelo.

| nível | features | por quê |
|---|---|---|
| 1 | **001**, **005**, **006**, **008**, **010** | nenhum card delas depende de card de outra feature |
| 2 | **002**, **003**, **007** | 002 e 003 dependem de 001; 007 não depende de ninguém por card, e está aqui pelo motivo da nota abaixo |
| 3 | **004** | depende de 003 |
| 4 | **009** | depende de 007 e de 005 |

### A ordem recomendada dentro do que os cards permitem

1. **006, Idioma e comunicação.** É base e quase todo teste de mensagem do pacote depende do
   catálogo de tradução dela. Deixá-la para o fim obriga a reescrever asserções em todas as
   outras features.
2. **008, parcialmente: US-8 e US-1.** A convergência para um único banco com migração
   versionada (US-8) é pré-requisito das três correções de contradição das features 002, 003 e
   005, que só podem dizer "o limite existe nos dois lados com o mesmo número" depois de existir
   um lado só. O "não encontrado" (US-1) é consumido pelas features 003 e 004.
3. **001, Gestão de donos.** É a raiz do domínio e o destino de toda escrita do sistema.
4. **010, parcialmente: US-3.** Marcar o campo com erro é mais barato na construção do fragmento
   que em quatro formulários já escritos.
5. **002, Busca e navegação de donos** e **003, Animais do dono**, em paralelo.
6. **004, Agenda e atendimento de visitas.**
7. **005, Catálogo de veterinários.**
8. **007, Acesso, identidade e dados pessoais.** Aqui está a nota mais importante desta seção:
   **nenhuma feature declara dependência de 007 nos `depends_on` dos cards, e ela atravessa
   todas as dez.** Cada uma diz, em Fora de escopo, que "quem pode fazer isso é a feature 007".
   Exigir identificação em 17 superfícies já construídas é mais trabalho que construí-las já
   exigindo, e por isso fazê-la cedo é mais barato que a posição dela na fila sugere. A ordem
   dos cards foi mantida porque quem a escreveu olhou o sistema; a observação fica para quem
   planeja.
9. **009, Vocabulários do domínio.** É a última na ordem de dependências e é a que destrava
   CA-3.1 da feature 005.
10. O resto de **008** e de **010**, que são verificações e descartes e podem andar a qualquer
    momento.

## 4. O que ficou de fora

**Nada ficou de fora.** Os 49 cards do kanban estavam na coluna `pronto`, os 49 têm critério de
aceite verificável, e os 49 viraram história de usuário. Nenhum card foi descartado por coluna e
nenhum foi descartado por falta de critério.

| id | título | coluna | motivo |
|---|---|---|---|
| — | — | — | nenhum card ficou de fora |

Três observações sobre o que esta tabela **não** significa:

- **Sete cards estão marcados como descarte no backlog** (REQ-027, REQ-028, REQ-032, REQ-042,
  REQ-043, REQ-044 e REQ-047), e eles **entraram** no pacote. Não são omissões: são cards cujos
  critérios de aceite são **proibições verificáveis**, coisas do legado que o sistema novo não
  deve reescrever. Estão nas features 005, 006, 008 e 010, e somados representam a maior
  economia estrutural do backlog, com cerca de 9.900 linhas de estilo descartadas, três
  definições de esquema convergidas em uma, duas superfícies alcançáveis sem identificação
  removidas e um formato de resposta nunca comprovado abandonado.
- **Dez cards estavam bloqueados ou em refinamento no backlog** e foram movidos para `pronto` por
  uma pessoa. O pacote os trata como selecionados, porque a seleção humana é a fonte de verdade
  do escopo, e registra em cada spec a dúvida que motivava o bloqueio.
- **Quinze critérios de aceite não têm tarefa.** Isso é diferente de card de fora: o card entrou,
  a história está escrita, e um ou mais critérios dela não puderam virar tarefa sem inventar um
  valor ou arbitrar um conflito. Cada um está na seção `Sem tarefa` do `tasks.md` da feature, com
  o motivo. A distribuição: feature 001 com 2, feature 002 com 3, feature 004 com 3, feature 005
  com 1, feature 007 com 2, feature 008 com 3 e feature 010 com 1.

## 5. As perguntas em aberto

São **56**, consolidadas das dez specs. Esta é a pauta da primeira conversa com quem conhece o
negócio, ordenada por alavancagem: os três primeiros itens travam, juntos, oito critérios de
aceite e dois testes que os cards já traziam.

### 5.1 Três conflitos entre decisões humanas, que só uma pessoa resolve

Nenhum destes três é lacuna da análise. Nos três, **uma resposta registrada em `questions.md`
contradiz o critério de um card que a mesma pessoa marcou como pronto**, e o pacote não arbitrou.

| conflito | onde | o que trava |
|---|---|---|
| **O veterinário entra na operação?** A resposta da Pergunta 2 o mantém como catálogo institucional, sem participação na operação; CA-4.2 e CA-4.4 da feature 004 exigem que a visita registre quem atendeu | feature 004, US-4 | dois critérios, mais três testes dos cards. E torna `UT-046-4` da feature 009 **inexecutável**: o `given` dele pede "um veterinário mencionado em atendimentos registrados", e esse estado é impossível de montar |
| **A coluna de autoria existe?** A resposta da Pergunta 12 foi colunas de criação e de alteração **sem autoria**; CA-4.1 e CA-4.2 da feature 007 exigem registrar quem fez cada gravação | feature 007, US-4 | dois critérios. A pergunta de fundo não foi feita a ninguém: **a identidade é por pessoa ou por função?** Com dois papéis compartilhados, uma coluna de autoria registra "escrita" e não registra ninguém |
| **A superfície de gestão fica aberta?** A resposta da Pergunta 10 manda mantê-la **toda exposta e sem autenticação**; CA-4.1, CA-4.2 e CA-4.3 da feature 008 mandam protegê-la. É o item 6 do Não negociável da constituição | feature 008, US-4 | três critérios. Nota operacional que pesa do outro lado: os manifestos de publicação **consomem** essa superfície para as sondas de saúde, então "fechar tudo" sem exceção não é implementável |

Um quarto caso é mais brando e está resolvido com exceção declarada, não com arbitragem: a
resposta da Pergunta 9 manda **manter a listagem completa da base de clientes acessível a
qualquer requisitante**, e CA-1.1 da feature 007 exige identificação em todo caminho que lê dado
pessoal. A tarefa entrega o critério para todos os outros caminhos e deixa a listagem de fora
**por uma linha nomeada em arquivo**, com a pergunta citada ao lado, porque uma exceção declarada
é revisável e uma exceção que mora na ausência de uma verificação é indistinguível de um
esquecimento.

### 5.2 Números que faltam, e cada um trava um critério

| pergunta | feature | trava |
|---|---|---|
| Qual é o país de operação, e portanto a regra de formato de telefone? | 001 | CA-2.3 |
| Qual é o limite de tempo de resposta da listagem, e com qual volume de base? | 002 | CA-5.1 e CA-5.2 |
| Qual é a janela de retroatividade de um atendimento? | 004 | CA-3.2 |
| Qual padrão de acessibilidade e qual nível de contraste? | 010 | CA-2.1 |
| Quais bancos serão homologados? O princípio P5 manda eleger **um** e a eleição não aconteceu | 002, 003, 009 | CA-4.2 da 002, metade de CA-2.4 da 003 e metade de CA-2.3 da 009 |
| Qual é o tempo de inatividade que expira a sessão? | 007 | nada: CA-1.3 é verificável contra qualquer valor configurado |
| Qual é o prazo de validade da memória do catálogo? | 005 | nada: metade de um teste do card |
| Quais são os tempos de espera das sondas? | 008 | nada: CA-3.4 exige que estejam declarados, não um valor |
| Qual é o idioma padrão? | 006 | nada: CA-1.2 e CA-1.3 valem contra qualquer valor configurado |
| O tamanho de página configurável tem valor padrão e faixa? | 002 | nada |
| A paginação pública e o limite da resposta de dados são o mesmo número? | 005 | nada |

### 5.3 Decisões de domínio tomadas pela metade

Nove destas vêm de respostas humanas que decidiram **que** algo existe e não **o que** ele é. É a
categoria mais traiçoeira do pacote, porque a decisão parece tomada.

- **O conjunto de situações e as transições**, para o animal (Pergunta 16), o veterinário
  (Perguntas 4 e 17), a espécie (nenhuma pergunta, o card pressupõe) e a visita (nenhuma). Afeta
  as features 003, 004, 005 e 009, e quatro critérios já escritos. Em particular: um animal
  falecido continua na ficha, aceita visita nova, conta para a unicidade de nome? Um veterinário
  desligado pode ser reativado?
- **O e-mail e o documento do dono** (Pergunta 15): são obrigatórios? Qual formato e limite? São
  também o destinatário da notificação da Pergunta 3. Feature 001.
- **A notificação ao dono** (Pergunta 3): por qual canal, em que momento, com que conteúdo. É a
  **única pendência de todo o pacote que cria integração externa nova**, e o legado tinha
  exatamente uma integração de runtime. A nota na seção Stack da feature 004 avisa quem decide a
  arquitetura: o ajuste medido que descartou seis das nove candidatas foi calculado com a
  premissa de integração zero.
- **O desfecho clínico do atendimento** (Pergunta 3): decidido que existe, sem dizer onde mora
  nem quais campos tem. Feature 004.
- **Quem observa a passagem do tempo** (feature 004): se a visita muda de situação sozinha quando
  a data chega, o sistema novo precisa de um ator que o legado não tinha, e a análise provou que
  não havia agendador, fila nem evento. Se a mudança é só humana, uma visita passada e não
  registrada fica agendada para sempre, que é a lacuna que a feature existe para fechar.
- **Qual combinação de campos caracteriza similaridade entre dois donos** (Pergunta 18): o
  desenho foi decidido, aviso em vez de chave natural, e o recorte dos campos não. Feature 001,
  trava CA-3.1.
- **O alcance da proteção contra dupla submissão** (Pergunta 18 e dúvida D-DET-07): vale para os
  formulários de animal e de visita, ou só para o de dono? Features 001 e 006.
- **Existe consumidor real da rota de dados do catálogo** (lacuna LAC-UC-04): feature 005, trava
  CA-4.1. É a única pergunta do pacote cuja resposta pode **apagar** trabalho em vez de criar.
- **O que, do histórico clínico, precisa ser preservado por obrigação legal** (feature 007): é
  pergunta jurídica, não técnica. As tarefas entregam a leitura operável que o teste do card fixa.

### 5.4 Decisões de desenho que ninguém tomou porque ninguém perguntou

- **Existe um papel administrativo, além de leitura e escrita?** A Pergunta 8 fixou dois papéis.
  Manutenção de vocabulário é ação administrativa, e tratá-la como escrita comum significa que
  quem cadastra um dono também renomeia espécies e desliga veterinários. Pode ser exatamente o
  que a clínica quer. Feature 009.
- **O dono é um ator do sistema?** A Pergunta 8 não disse. A descrição de um card pressupõe que
  seja ("nenhum cliente veja a ficha de outro"), e se for, aparece uma relação entre identidade e
  dono que nenhum card modela. Feature 007.
- **Formato de data e de número acompanham o idioma?** REG-26 fixa o formato de data do animal
  sem localização, e o princípio P7 manda todo texto visível vir do catálogo. Features 003 e 006.
- **Para onde vão as credenciais que hoje estão em texto puro no repositório?** É a parte da
  Pergunta 10 que ficou sem resposta, e é **independente** do conflito sobre a superfície de
  gestão: mesmo mantendo-a aberta, tirar a credencial do arquivo reduz o que ela expõe.
  Feature 008.
- **A identidade visual do legado é para preservar?** A cor de link que o tema pedia nunca chegou
  à tela, e restaurá-la **reprovaria** no contraste, a 3,2 para 1. Preservar a marca e cumprir
  CA-2.1 podem ser incompatíveis com essa cor. Feature 010.
- **Quais indicadores de uso acompanhar?** Feature 008, e não há como derivá-los: a cegueira do
  legado era completa.
- **A anonimização alcança dado pessoal em campo livre?** A descrição da visita tem 255
  caracteres livres e nada impede que contenha nome ou telefone. CA-3.2 da feature 007 promete
  uma coisa que um campo livre pode desmentir.
- **O log tem prazo de retenção, e ele é compatível com um log sem dado pessoal?** Features 007 e
  008.
- Mais oito perguntas de menor alcance, cada uma na spec da feature: a camada em que a comparação
  de espécie ignora a caixa (003), a ordenação explícita do catálogo (005), o tratamento do
  arquivo vazio de recurso na verificação de completude (006), o seletor de idioma nas telas da
  feature 008 (006), a especialidade criada por quem (009), o efeito de renomear espécie sobre
  consumidores (009), a família de fontes e os pesos (010), o compilador de estilo (010) e se "os
  quatro formulários" continuam sendo quatro (010).

### 5.5 Três verificações que ninguém fez, e que valem mais que várias respostas

Estas não são perguntas para uma pessoa: são comandos que ninguém executou. Em dez etapas de
análise, **a aplicação nunca foi executada, nenhum teste foi rodado, nenhuma conexão a banco foi
aberta e nenhuma requisição HTTP foi disparada**.

| o quê | o que fecha |
|---|---|
| Rodar a suíte de testes do legado | as contradições C1, C2 e C4, que são as três de maior gravidade, mais duas dúvidas de arquitetura. É a pendência de maior alavancagem de todo o processo |
| Executar a aplicação e capturar quatro telas, uma por formulário | as quatro dúvidas que a análise de estilo marcou como **bloqueantes para reimplementação fiel**. A extensão do dano das catorze classes de estilo órfãs **nunca foi observada**: está provado que a folha não as define, e não o que isso produz na tela |
| Consultar o log de produção ou o APM que a resposta da Pergunta 11 afirma existir | a única fonte possível sobre uso real, caminho preferido e erro recorrente. Nenhuma etapa o consultou, e por isso a priorização de todo o pacote continua sendo inferência estrutural, derivada de posição na cadeia de dependências |

E uma quarta, de outra natureza, registrada no fim de `questions.md`: ler o plano de teste de
carga do repositório legado. É o único arquivo não coberto por nenhum artefato deste processo, e
a única fonte potencial de informação sobre **uso esperado**, que é exatamente o que falta.
