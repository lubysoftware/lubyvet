# Agenda e atendimento de visitas

**Origem:** épico EP-4 do backlog do sistema legado (objetivo do épico: marcar o atendimento e, se a decisão de domínio permitir, registrar o que aconteceu nele)
**Cards:** REQ-018, REQ-019, REQ-020, REQ-021, REQ-022

## Por que esta feature existe

A clínica precisa saber o que está marcado e o que já foi feito em cada paciente. O legado
só entregava a primeira metade, e nem isso por inteiro: a visita era criada e nada acontecia
depois. Não havia caminho de edição, nem de cancelamento, nem campo de situação, nem vínculo
com quem atendeu. Corrigir uma visita marcada por engano exigia acesso direto ao banco. O
resultado é que o sistema modelava um compromisso futuro imutável, e nunca um atendimento
realizado: a transição de "agendada" para "passada" acontecia com o relógio e **nada no
sistema a observava**, porque não existia agendador, fila ou evento em linha alguma do
projeto.

É a feature mais afetada por decisão humana de todo o pacote. Três dos cinco cards estavam
registrados como bloqueados no backlog, pela mesma pergunta de domínio, e a resposta chegou:
a Pergunta 1 decidiu **separar agendamento e atendimento em duas entidades**, e a Pergunta 3
decidiu que o sistema novo tem os quatro itens que faltavam, notificação ao dono,
edição e cancelamento, responsável e desfecho. Isso é mudança de domínio, não reescrita, e
está dito assim em cada história que dela depende.

## Histórias de usuário

### US-1 (REQ-018) Agendar visita para o animal

Como usuário do sistema, quero marcar uma data de atendimento para um animal e anotar o que
será tratado para que a clínica saiba o que está agendado.

**Critérios de aceite**

- [ ] CA-1.1 Com data válida e descrição preenchida, a visita é gravada vinculada ao animal e o usuário termina na ficha do dono
- [ ] CA-1.2 Descrição em branco ou com mais de 255 caracteres devolve o formulário com o campo marcado e nada é gravado
- [ ] CA-1.3 Data fora da faixa permitida é recusada com mensagem traduzida no campo de data
- [ ] CA-1.4 O formulário abre com uma data já sugerida e o seletor de data impede escolher data fora da faixa permitida

**Regras de negócio que valem aqui**

- REG-27 data e descrição obrigatórias, descrição com no máximo 255 caracteres (`domain.md` §2.4)
- REG-29 no legado, o formulário abria já preenchido com amanhã (`domain.md` §2.4, ADR-0003)
- REG-30 no legado, o seletor de data do navegador bloqueava datas anteriores a amanhã (`domain.md` §2.4)

> CA-1.3 e CA-1.4 dizem "faixa permitida", e não "a partir de amanhã", de propósito: qual é a
> faixa é US-3. O que estas duas fixam é que a faixa existe num só lugar e que o limite
> declarado no campo e o limite que a validação aplica são o **mesmo dia** (`UT-018-7`). No
> legado os três lugares eram coerentes por sorte, não por construção.

### US-2 (REQ-019) Mostrar o histórico de visitas do animal no agendamento

Como usuário do sistema, quero ver o que já foi atendido naquele animal enquanto marco a
próxima visita para não repetir uma anotação nem marcar em duplicidade.

**Critérios de aceite**

- [ ] CA-2.1 O formulário de agendamento lista as visitas já registradas do animal, em ordem crescente de data, com data e descrição
- [ ] CA-2.2 A visita que está sendo criada não aparece na lista de histórico
- [ ] CA-2.3 Animal sem visita alguma apresenta a seção vazia, com mensagem explicando a ausência
- [ ] CA-2.4 O rótulo da seção corresponde ao que ela mostra: se listar também visitas futuras, não se chama "visitas anteriores"

**Regras de negócio que valem aqui**

- REG-32 as visitas de um animal aparecem em ordem crescente de data (`domain.md` §2.4)
- REG-33 o formulário mostra o histórico de visitas do animal, descartada a visita em branco criada junto dele (`domain.md` §2.4)

> **Divergência não arbitrada do legado.** Cinco etapas da análise se pronunciaram sobre esta
> seção e nenhuma executou a aplicação: o inventário de interface a registrou como quebrada
> (BUG-UI-05) e a etapa seguinte refutou o diagnóstico por precedência de atributos do motor
> de template (dúvida D-DET-03). O Revisor arbitrou em favor da refutação, e o card **não
> depende do resultado**: os quatro critérios acima descrevem o comportamento esperado do
> sistema novo, que é verificável por teste independentemente de qual leitura do legado estava
> certa.

### US-3 (REQ-020) Lançar atendimento de hoje e lançamento retroativo

Como usuário do sistema, quero registrar o atendimento que está acontecendo agora, ou um que
já aconteceu, para que a ficha do animal reflita a realidade da clínica.

**Critérios de aceite**

- [ ] CA-3.1 Uma visita com a data de hoje é aceita e gravada
- [ ] CA-3.2 Um atendimento com qualquer data passada ou com a data de hoje é aceito; data futura é recusada com mensagem traduzida *(D06: sem janela de retroatividade)*
- [ ] CA-3.3 O valor sugerido pelo formulário e o limite do seletor de data acompanham a regra escolhida, sem contradizê-la

**Regras de negócio que valem aqui**

- REG-28 no legado, a data tinha de ser estritamente futura, e **hoje era recusado** (`domain.md` §2.4, ADR-0003)
- REG-29 e REG-30 o valor padrão e o limite do seletor acompanhavam REG-28 (`domain.md` §2.4)
- Decisão humana da Pergunta 1: agendamento e atendimento são **duas entidades**. É essa resposta que desbloqueia este card e que torna CA-3.1 e CA-3.2 compatíveis com a recusa de data passada no **agendamento**: o que aceita hoje e retroativo é o atendimento

> O legado recusava a data de hoje em três lugares coerentes, a validação, o valor padrão e o
> limite do seletor, e a análise registrou que não era possível distinguir regra deliberada de
> erro de borda de quem queria "não pode ser no passado" (dúvida D-DET-10). A Pergunta 1 não
> respondeu qual das duas era, e não precisava: ao separar as duas entidades, a recusa de hoje
> passa a ser correta para o agendamento e irrelevante para o atendimento.

### US-4 (REQ-021) Registrar o atendimento realizado

Como usuário do sistema, quero anotar que a visita aconteceu, quem atendeu e o que foi feito
para que a ficha do animal sirva de histórico clínico e não apenas de agenda.

**Critérios de aceite**

- [ ] CA-4.1 Uma visita passa a ter situação (Agendada, Realizada, Cancelada, Não compareceu; os três últimos finais), e a mudança de situação fica registrada com data *(D10)*
- [ ] CA-4.5 Agendamento com data passada e ainda Agendada aparece como **pendente de registro**, um estado derivado na leitura; nenhum processo muda a situação sozinho *(D11)*
- [ ] CA-4.6 Animal Falecido ou Transferido não aceita agendamento novo *(D09)*
- [ ] CA-4.2 A visita realizada **pode** registrar qual veterinário atendeu, escolhido entre os veterinários ativos do catálogo; o campo é opcional *(D01)*
- [ ] CA-4.7 O atendimento tem os campos de D26: data e queixa principal obrigatórias; peso, diagnóstico, conduta, data de retorno e veterinário opcionais, com os limites de D26 aplicados na validação e no esquema *(D26)*
- [ ] CA-4.3 A ficha do animal distingue visualmente o que está agendado do que já foi atendido
- [ ] CA-4.4 O sistema responde "quais animais este veterinário atendeu" a partir dos atendimentos que registraram veterinário *(D01)*

**Regras de negócio que valem aqui**

- REG-31 no legado, a visita **não** registrava qual veterinário atendeu (`domain.md` §2.4)
- REG-34 no legado, visita registrada não se editava nem se cancelava (`domain.md` §2.4)
- Máquina de estados EM-03 de `state-machines.md`: "Realizada" era estado fantasma. A transição de agendada para passada acontecia com o relógio e nada no sistema a observava
- Decisões humanas das Perguntas 1 e 3: duas entidades, e os quatro itens que faltavam passam a existir, incluindo responsável e desfecho

> **Arbitrado em `memory/decisoes.md` D01: o veterinário é opcional no atendimento.** Texto original do conflito, mantido como histórico: CA-4.2 e CA-4.4 exigem que a
> visita registre o veterinário que atendeu e que o sistema responda quais animais ele
> atendeu. A resposta da Pergunta 2 diz o contrário: o veterinário **permanece como catálogo
> institucional, sem participação na operação**. As duas instruções vêm de pessoas, e o
> agente de codificação não arbitra entre elas. É o mesmo tipo de conflito do item 6 do Não
> negociável da constituição. Consequência concreta, medida pela análise: ligar os dois
> domínios acaba com a propriedade que torna o catálogo de veterinários extraível mexendo em
> 8 de 28 componentes, e é exatamente essa propriedade que hoje impede o sistema de responder
> CA-4.4.

### US-5 (REQ-022) Remarcar ou cancelar uma visita agendada

Como usuário do sistema, quero remarcar ou cancelar uma visita marcada por engano para
corrigir a agenda sem precisar de acesso ao banco de dados.

**Critérios de aceite**

- [ ] CA-5.1 Uma visita futura pode ter a data e a descrição alteradas, e a alteração aparece na ficha do dono
- [ ] CA-5.2 Uma visita futura pode ser cancelada, deixando de contar como compromisso, e o cancelamento fica registrado
- [ ] CA-5.3 Um cancelamento não apaga o histórico: é possível saber que houve uma visita cancelada e quando

**Regras de negócio que valem aqui**

- REG-34 no legado, visita registrada não se editava nem se cancelava, e a correção de um engano só era possível por acesso direto ao banco (`domain.md` §2.4)
- REG-41 nada é apagado no sistema (`domain.md` §2.5, ADR-0007)
- Princípio P2 da constituição: dado se anonimiza, nunca se apaga em silêncio. O cancelamento é mudança de situação, não exclusão de linha (`UT-022-5`)
- Decisão humana da Pergunta 3: edição e cancelamento passam a existir

## Fora de escopo

- **Notificar o dono.** A resposta da Pergunta 3 incluiu notificação ao dono entre os quatro
  itens que o sistema novo precisa ter, e **nenhum card do kanban traz critério de aceite para
  ela**. Fica registrada no modelo de dados e nos contratos do `plan.md` como pendência
  declarada, e repetida em Perguntas em aberto. É a decisão de maior impacto arquitetural de
  toda a análise, porque o legado tinha exatamente uma integração de runtime, o banco, e
  notificar o dono cria a segunda.
- **O desfecho clínico do atendimento.** A mesma Pergunta 3 decidiu que o desfecho existe, e
  nenhum card diz quais campos ele tem. CA-4.1 a CA-4.4 falam de situação, responsável e
  distinção visual, não de conteúdo clínico.
- **Quem pode agendar, remarcar, cancelar e registrar atendimento.** É a feature 007. Nesta
  feature o ator é "usuário do sistema", deliberadamente genérico, pelo mesmo motivo das
  features 001 e 003.
- **Apagar visita.** Nenhum card pede exclusão, e CA-5.3 e `UT-022-5` exigem o contrário.
- **O catálogo de veterinários.** Ler, paginar e manter o quadro são as features 005 e 009.
  Aqui o catálogo aparece apenas como a origem do responsável de CA-4.2, que é objeto do
  conflito registrado em US-4.
- **O cadastro e a edição do animal.** É a feature 003. A recusa de operação que mistura o
  animal de um dono com a ficha de outro, que vale também para o agendamento, é CA-5.2 de lá.
- **A ficha do dono.** O destino de toda escrita desta feature é a ficha do dono, que é US-6
  da feature 001, e a paginação do histórico dentro dela também.

## Perguntas em aberto

- [x] **O veterinário entra na operação ou não?** É o conflito registrado em US-4: a Pergunta 2 diz que ele permanece catálogo institucional sem participação na operação, e CA-4.2 e CA-4.4 exigem o vínculo com o atendimento. Sem arbitragem humana, as duas tarefas que dependem dele ficam sem entrega, e isso está dito em `tasks.md`. Nenhuma das duas instruções é inferência da análise: as duas são decisão de pessoa. → ✅ **D01**: opcional no atendimento
- [x] **Qual é a janela de retroatividade?** CA-3.2 exige um valor concreto, "aceita dentro da janela definida e recusada fora dela", e esse valor não existe em card, em regra de domínio nem em código do legado, que recusava qualquer data não futura. Sem ele o critério não tem teste possível. → ✅ **D06**: sem limite; data futura recusada
- [x] **Quais são as situações da visita e quais transições são válidas?** CA-4.1 exige situação com data de mudança e CA-5.2 exige a situação de cancelada. O conjunto, a ordem e o que cada transição permite não estão em card algum. No legado nenhuma entidade tinha campo de situação e não existia um único enumerado em todo o código. → ✅ **D10**
- [x] **Quem observa a passagem do tempo?** A máquina EM-03 registra que "Realizada" era estado fantasma porque nada no sistema observava o relógio. Se a situação muda sozinha quando a data chega, o sistema novo precisa de um ator que o legado não tinha, e a análise provou que não havia agendador, fila nem evento. Se a mudança é só por ação humana, uma visita passada e não registrada fica indefinidamente como agendada, que é exatamente a lacuna que esta feature existe para fechar. → ✅ **D11**: ninguém; "pendente de registro" é derivado
- [x] **A notificação ao dono, decidida na Pergunta 3, vai por qual canal, em que momento e com que conteúdo?** Depende também do e-mail do dono, decidido na Pergunta 15 e sem critério de aceite em card algum (pergunta em aberto da feature 001). É a única pendência de todo o pacote que cria integração externa nova. → ✅ **D12**: WhatsApp (Meta Cloud API) ao agendar e no D-1
- [x] **Pode haver agendamento para animal com situação de falecido?** Depende do campo de situação do animal, decidido na Pergunta 16 e sem critério de aceite em card algum (pergunta em aberto da feature 003). → ✅ **D09**: Ativo, Falecido, Transferido
- [ ] **A descrição da visita vira dado clínico?** Se o desfecho existir como campo próprio, a descrição de 255 caracteres deixa de ser o lugar onde se anota o que foi feito, e CA-1.2 passa a descrever o campo de outra coisa. A Pergunta 3 decidiu que o desfecho existe, mas não onde ele mora. → ✅ **D26**: atendimento clínico enxuto

## Rastreabilidade

| item | vem de |
|---|---|
| US-1 | REQ-018 · UC-07 · REG-27, REG-29, REG-30 · `VisitController.java:97`, `Visit.java:43`, `Owner.java:176`, `createOrUpdateVisitForm.html:30` · ADR-0003 |
| US-2 | REQ-019 · UC-07 · REG-32, REG-33 · `createOrUpdateVisitForm.html:51` · BUG-UI-05 e D-DET-03, não arbitrados pelo card |
| US-3 | REQ-020 · UC-07 · REG-28, REG-29, REG-30 · `VisitController.java:100` · D-DET-10, LAC-UC-09 · Pergunta 1 |
| US-4 | REQ-021 · UC-07, UC-08 · REG-31, REG-34 · `Visit.java:43`, `db/h2/schema.sql` · EM-03 de `state-machines.md` · Perguntas 1, 2 e 3, em conflito |
| US-5 | REQ-022 · UC-07 · REG-34, REG-41 · `VisitController.java:63` · ADR-0007 · Pergunta 3 |
