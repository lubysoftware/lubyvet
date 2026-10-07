# Operação, erros e observabilidade

**Origem:** épico EP-8 do backlog do sistema legado (objetivo do épico: falhar de forma previsível e permitir saber o que está acontecendo em produção)
**Cards:** REQ-037, REQ-038, REQ-039, REQ-040, REQ-041, REQ-042, REQ-043, REQ-044

## Por que esta feature existe

O legado falhava de forma imprevisível e era cego sobre si mesmo. Dono ou animal inexistente
num endereço produzia **falha genérica de sistema**, e não "não encontrado", porque não havia
nenhum tratador de exceção em todo o projeto (REG-48). O mesmo arranjo não distinguia erro de
domínio de erro técnico: tudo terminava na mesma página. E a cegueira era total: **zero**
arquivo de log, **zero** configuração de biblioteca de log, **zero** ocorrências de registrador
em todo o código de produção. Toda a configuração de log eram três linhas, duas delas
comentadas. Nenhuma métrica, nenhum rastro distribuído. Nenhuma afirmação sobre uso real,
caminho preferido do usuário ou erro recorrente era possível, e por isso a priorização das sete
unidades da análise foi derivada de posição na cadeia de dependências, e não de uso.

É a feature com mais cards de descarte do pacote, três dos oito, e a soma deles é a maior
economia estrutural do backlog: uma rota que provoca falha de propósito, um console de banco de
dados embutido na aplicação, e **três definições de esquema paralelas** que são a origem de
quatro das cinco contradições de camada que a análise encontrou.

E é a feature onde está o terceiro conflito entre decisão humana e card deste pacote, já
registrado no item 6 do Não negociável da constituição.

## Histórias de usuário

### US-1 (REQ-037) Responder "não encontrado" para dono ou animal inexistente

Como usuário do sistema, quero receber uma mensagem clara quando o cadastro que pedi não existe
para saber que errei o endereço e não que o sistema quebrou.

**Critérios de aceite**

- [ ] CA-1.1 Pedir a ficha, a edição ou o agendamento de um dono ou animal inexistente responde "não encontrado" com página amigável, nunca falha genérica de sistema
- [ ] CA-1.2 A resposta não expõe rastro de pilha, nome de classe nem consulta ao banco
- [ ] CA-1.3 O mesmo identificador inexistente não provoca duas buscas ao banco
- [ ] CA-1.4 Existe teste cobrindo identificador inexistente em cada caminho que recebe identificador

**Regras de negócio que valem aqui**

- REG-48 no legado, dono ou animal inexistente no endereço produzia falha genérica de sistema, e não "não encontrado" (`domain.md` §2.6)

> CA-1.3 é um achado próprio da análise, e vale dizer de onde vem: no legado o mesmo
> identificador era carregado duas vezes por requisição, uma na resolução do vínculo e outra
> no caminho de tratamento. Não é otimização gratuita: é a diferença entre uma busca e duas
> para **todo** pedido com identificador inexistente, que é exatamente o que uma varredura de
> endereços produz em volume.

### US-2 (REQ-038) Apresentar página de erro sem vazar informação de ambiente

Como clínica, quero que uma falha inesperada mostre ao usuário uma página compreensível e nada
mais para não entregar informação do ambiente a quem alcançar o sistema.

**Critérios de aceite**

- [ ] CA-2.1 Uma falha inesperada apresenta página de erro com mensagem compreensível e um identificador da ocorrência
- [ ] CA-2.2 A resposta não contém rastro de pilha, versão de biblioteca, caminho de arquivo nem nome de classe
- [ ] CA-2.3 A falha fica registrada no log da aplicação com o mesmo identificador apresentado ao usuário
- [ ] CA-2.4 Existe teste que provoca uma falha e verifica a ausência desses elementos na resposta

**Regras de negócio que valem aqui**

- REG-48 o legado não distinguia erro de domínio de erro técnico: tudo terminava na mesma página de erro (`domain.md` §2.6)

> O identificador de ocorrência é o que liga CA-2.1 a CA-2.3, e é a única coisa desta história
> que o legado não tinha de forma alguma: sem log, não havia o que ligar. `UT-038-5` mantém a
> indistinção de REG-48 de propósito, erro de domínio e erro técnico chegam à mesma resposta,
> e exige que cada ocorrência tenha identificador **distinto**.

### US-3 (REQ-039) Expor sondas de vivacidade e de prontidão

Como orquestrador da infraestrutura, quero saber se a instância está viva e se já pode receber
tráfego para decidir se a mantenho, reinicio ou tiro de rotação.

**Critérios de aceite**

- [ ] CA-3.1 O caminho de vivacidade responde positivamente com a aplicação no ar e negativamente quando ela não consegue mais atender
- [ ] CA-3.2 O caminho de prontidão só responde positivamente quando as dependências necessárias, inclusive o banco, estão acessíveis
- [ ] CA-3.3 As duas respostas não exigem identificação e não revelam nada além do estado agregado
- [ ] CA-3.4 Os dois caminhos estão declarados no manifesto de publicação, com os tempos de espera definidos

> CA-3.3 é a parte que importa e a mais fácil de perder: as sondas ficam abertas **e** não
> revelam nada além do estado agregado. `UT-039-3` exige que um verificador de banco que falhe
> com mensagem detalhada não faça a resposta carregar nome de dependência, endereço, credencial
> ou causa. No legado a superfície de gestão inteira estava aberta e **respondia tudo**, que é
> a combinação oposta.

### US-4 (REQ-040) Proteger a superfície de gestão e monitoração

Como clínica, quero que os recursos de gestão e diagnóstico só sejam acessíveis a quem opera o
sistema para que a configuração do ambiente não fique legível pela rede.

**Critérios de aceite**

- [ ] CA-4.1 Os caminhos de gestão que revelam configuração, ambiente ou credencial exigem identificação e recusam acesso anônimo
- [ ] CA-4.2 Somente as sondas de saúde ficam abertas, e elas respondem apenas o estado agregado
- [ ] CA-4.3 Existe teste que pede sem credencial cada caminho de gestão exposto e verifica a recusa
- [ ] CA-4.4 Nenhum valor de credencial aparece em resposta, em log ou em saída de console

> **Arbitrado em `memory/decisoes.md` D03: só as sondas ficam abertas.** Texto original, mantido como histórico: É o item 6 do Não negociável da
> constituição, e o terceiro conflito deste pacote. A resposta da Pergunta 10 foi **manter toda
> a superfície de gestão exposta e sem autenticação**; este card, de prioridade máxima e
> movido para pronto no kanban, manda protegê-la. As duas instruções vêm de pessoas e o agente
> de codificação não arbitra entre elas.
>
> O que a análise mediu, para quem for decidir: a exposição é a lacuna mais grave do sistema, e
> **não é defeito de código**, é a soma de duas decisões de configuração de uma aplicação de
> demonstração, com aviso escrito no próprio arquivo de que não se deve fazer aquilo em
> produção. Sob os perfis de banco externo, ela torna legíveis pela rede credenciais que estão
> em texto puro no repositório, inventariadas nas lacunas G8, G9 e G12 de
> `integrations/integrations.md`. E há uma nota operacional que pesa do outro lado: os
> manifestos de publicação **consomem** essa mesma superfície para as sondas de saúde, então
> fechá-la sem exceção quebra a publicação, que é exatamente o que CA-4.2 tenta resolver.
>
> **CA-4.4 não está em conflito.** Mascarar valor de credencial em resposta, em log e em saída
> de console não depende de abrir ou fechar nada, e por isso ela é entregue. A lacuna G12
> registra o caso mais direto: um utilitário de teste do legado imprimia a senha do banco sem
> máscara.

### US-5 (REQ-041) Registrar log de aplicação e métricas de uso

Como clínica, quero poder saber o que está acontecendo no sistema em operação para diagnosticar
um erro relatado e para descobrir o que de fato é usado.

**Critérios de aceite**

- [ ] CA-5.1 Toda falha inesperada é registrada com momento, caminho pedido e identificador da ocorrência
- [ ] CA-5.2 As operações de escrita de dono, animal e visita são registradas com momento e resultado
- [ ] CA-5.3 O log não contém dado pessoal nem credencial
- [ ] CA-5.4 As métricas de D27 (agenda, atendimento, base de clientes, WhatsApp) são publicadas por OpenTelemetry, sem dado pessoal em valor nem em rótulo *(D27)*

> O card está em refinamento no backlog porque o título promete mais do que os critérios
> entregam: os três acima são verificáveis, e **o conjunto de métricas de negócio que importa
> não é derivável do legado**. A dúvida D-DET-06 constata a cegueira completa, e dela decorre
> que quais indicadores acompanhar precisa vir de quem opera. CA-5.3 é a tensão interna da
> história e merece atenção: um log útil para diagnosticar e sem dado pessoal exige que o dono
> apareça por identificador, nunca por nome (`UT-041-3`).

### US-6 (REQ-042) Não provocar falha deliberada por nenhum caminho

Como clínica, quero que nenhum caminho do sistema produza falha de propósito para não manter
uma superfície alcançável que serve só para demonstração.

**Critérios de aceite**

- [ ] CA-6.1 Nenhum caminho do sistema novo provoca falha deliberada
- [ ] CA-6.2 O menu principal não oferece item algum que leve a erro
- [ ] CA-6.3 O comportamento da página de erro é verificado por teste, e não por rota exposta ao usuário

**Regras de negócio que valem aqui**

- REG-48 o sistema não distinguia erro de domínio de erro técnico (`domain.md` §2.6)

> **Card marcado como descarte no backlog.** O legado tinha um item de menu e um caminho que
> lançavam uma exceção de propósito, para demonstrar a página de erro em apresentações: o
> repositório é a aplicação de referência oficial de um ecossistema, e o artefato é didático
> puro. Num sistema em operação é superfície alcançável sem identificação que produz falha de
> propósito, e o que ela demonstra está coberto por US-2, com teste. CA-6.3 é a troca explícita:
> a demonstração vira teste.

### US-7 (REQ-043) Não servir console de banco de dados por nenhum caminho

Como clínica, quero que a aplicação não ofereça console de banco de dados em perfil algum para
não embutir no sistema uma superfície de execução de comando arbitrário.

**Critérios de aceite**

- [ ] CA-7.1 O sistema novo não serve console de banco de dados por nenhum caminho, em nenhum perfil
- [ ] CA-7.2 Nenhuma dependência que o habilite está presente em artefato publicável

> **Card marcado como descarte no backlog**, e o mais barato de todos: no legado o console só
> existia com as ferramentas de desenvolvimento no caminho de classes, que são opcionais e
> ficam fora do artefato publicado. Ou seja, **nem o próprio legado o levava a produção**.
> Reescrevê-lo seria criar um risco que hoje não existe. CA-7.2 é a parte que impede a
> regressão por dependência transitiva.

### US-8 (REQ-044) Operar sobre um único banco homologado

Como clínica, quero que o sistema tenha um banco homologado só, com uma definição de esquema
só, para que nenhuma regra de negócio mude de comportamento conforme o ambiente.

**Critérios de aceite**

- [ ] CA-8.1 O sistema novo tem um único banco homologado e um único conjunto de definição de esquema
- [ ] CA-8.2 A evolução do esquema acontece por migração versionada, aplicada e verificada em teste
- [ ] CA-8.3 Nenhuma regra de negócio muda de comportamento conforme o banco

**Regras de negócio que valem aqui**

- REG-14 no legado, a busca ignorava a caixa em apenas dois dos três dialetos (`domain.md` §2.2)

> **Card marcado como descarte no backlog, e é a maior economia estrutural de todo ele.** Três
> definições de esquema em paralelo, sem ferramenta de migração e sem nenhuma eleita como
> canônica, são a origem de **quatro das cinco contradições** encontradas: a busca sensível à
> caixa divergente, a restrição anônima que quebrava a mensagem de nome de animal duplicado, o
> limite de tamanho ausente num dialeto e a unicidade da junção faltando justamente no perfil
> padrão. É a dívida DT-02. Os princípios P5 e P6 da constituição dizem a mesma coisa em forma
> de princípio, e as três correções caem dentro dos cards REQ-011, REQ-014 e REQ-016, nas
> features 002, 003 e 005.

## Fora de escopo

- **Autenticar quem usa o sistema.** É a feature 007. US-4 desta feature depende de identidade
  existir, e o card declara essa dependência por REQ-039, não por REQ-033, o que é uma lacuna
  do backlog registrada no `plan.md`.
- **Qual é o dialeto de banco eleito.** CA-8.1 exige que exista um; qual é ele é item 5 do Não
  negociável da constituição e decisão humana.
- **Rastro distribuído.** O legado não tinha, nenhum card pede, e com uma só integração de
  runtime o valor é baixo. Fica registrado para não reaparecer como suposição.
- **Onde as credenciais passam a morar.** A Pergunta 10 tinha três partes e a resposta cobriu
  duas. A parte sobre tirar as credenciais dos arquivos do repositório para variável de
  ambiente ou cofre **ficou sem resposta**, e nenhum card a cobre. CA-4.4 trata de mascarar o
  valor, que é coisa diferente de onde ele mora.
- **Limite de taxa.** A varredura de endereços sequenciais que a análise descreve seria contida
  por limite de taxa, o legado não tinha nenhum e nenhum card pede.

## Perguntas em aberto

- [x] **A superfície de gestão fica aberta ou protegida?** É o conflito de US-4 e o item 6 do Não negociável da constituição. Três dos quatro critérios daquela história ficam sem tarefa enquanto isso durar. A nota operacional sobre as sondas, que os manifestos de publicação consomem a mesma superfície, é parte da pergunta e não um detalhe. → ✅ **D03**: protegida, só as sondas abertas
- [x] **Para onde vão as credenciais que hoje estão em texto puro no repositório?** Variável de ambiente, cofre, outro mecanismo. É a parte da Pergunta 10 que ficou sem resposta, e ela é independente do conflito acima: mesmo mantendo a superfície aberta, tirar a credencial do arquivo reduz o que ela expõe. → ✅ **P-13**: Secret do K8s via External Secrets
- [x] **Quais indicadores de uso acompanhar?** O título de US-5 os promete e nenhum critério os define, porque não há como derivá-los do legado: a cegueira era completa. Precisa vir de quem opera. → ✅ **D27**: agenda, atendimento, base de clientes e WhatsApp
- [x] **Qual é o APM ou o log de produção a que se pode ter acesso?** A resposta da Pergunta 11 afirma que existe um, e a análise provou, por varredura, que o código de produção do legado não tem uma linha de registro de log. As duas coisas podem ser verdadeiras ao mesmo tempo se o log for de infraestrutura e não de aplicação, e nesse caso ele não responde o que a Pergunta 11 queria responder. **Nenhuma etapa da análise consultou esse log**, e por isso a priorização das sete unidades continua sendo inferência estrutural. É a pendência de maior alavancagem desta feature. → ✅ moot: o legado nunca operou; o sistema novo usa OpenTelemetry e Grafana (P-16)
- [x] **Quais são os tempos de espera das sondas?** CA-3.4 exige que estejam definidos no manifesto, e os valores não existem em card algum. A dívida DT-19 registra que o manifesto do legado também não tinha limites de recurso, sonda de inicialização nem transporte seguro. → ✅ **P-16**
- [x] **O log tem prazo de retenção, e ele é compatível com CA-5.3?** Um log sem dado pessoal reduz a pergunta, mas o identificador do dono ainda é dado que liga a uma pessoa enquanto a base existir. Liga-se à política de retenção, que é pergunta em aberto da feature 007. → ✅ **P-16**: 30 dias, sem dado pessoal

## Rastreabilidade

| item | vem de |
|---|---|
| US-1 | REQ-037 · UC-03 a UC-07 · REG-48 · `OwnerController.java:68,182`, `PetController.java:70` |
| US-2 | REQ-038 · UC-11 · REG-48 · `error.html:1`, `CrashController.java:31` |
| US-3 | REQ-039 · UC-12 · `application.properties:21`, `k8s/petclinic.yml:47` |
| US-4 | REQ-040 · UC-12 · `application.properties:21` · lacunas G9 e G12 · Pergunta 10, em conflito com o card · item 6 do Não negociável |
| US-5 | REQ-041 · UC-11, UC-12 · `application.properties:24` · D-DET-06 · Pergunta 11 |
| US-6 | REQ-042 · UC-11 · REG-48 · `CrashController.java:31`, `fragments/layout.html:56` · card de descarte |
| US-7 | REQ-043 · UC-12 · `application.properties` · card de descarte |
| US-8 | REQ-044 · UC-01, UC-05, UC-08 · REG-14 · `db/{h2,mysql,postgres}/schema.sql` · dívida DT-02 · contradições C2, C3, C4 · card de descarte |
