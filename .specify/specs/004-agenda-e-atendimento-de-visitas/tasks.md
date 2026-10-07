# Tarefas, Agenda e atendimento de visitas

> Ordem de dependência. `[P]` marca tarefas que podem rodar em paralelo por tocarem
> arquivos diferentes.
>
> A coluna *satisfaz* aponta o critério de aceite do `spec.md`. Tarefa sem critério é
> infraestrutura, e está dito nela. Os identificadores `UT-nnn-n` são os testes que os
> cards do backlog já traziam, preservados como tarefa de teste própria.
>
> Três dos dezoito critérios desta feature **não têm tarefa**, e nenhum por esquecimento. Ver
> a seção `Sem tarefa` no fim.

- [x] **T001** Declarar o nome de toda coluna do Agendamento e do Atendimento no mapeamento,
      sem depender de estratégia automática de nomenclatura
      *entrega:* o mapeamento das duas entidades com nome de coluna explícito em cada campo,
      incluindo a coluna de animal, que no legado era nulável e não tinha campo correspondente
      *satisfaz:* — (infraestrutura exigida pelo princípio P3 da constituição e pela decisão
      da Pergunta 14)
      *depende de:* a feature 003 ter o Animal modelado e migrado

- [x] **T002** Entregar o relógio como dependência injetável, antes de qualquer regra de data
      *entrega:* uma fonte de tempo que os testes controlam, e a garantia de que nenhuma regra
      de data desta feature lê o relógio do sistema diretamente. 14 dos 26 testes dos cards
      pedem relógio controlado no `given`
      *satisfaz:* — (infraestrutura, pré-requisito de CA-1.3, CA-1.4, CA-3.1 e CA-3.3)

- [ ] **T003** Modelar o Agendamento com animal, data, descrição, situação, versão e datas de
      criação e de alteração
      *entrega:* a entidade com a data e o animal **obrigatórios nos dois lados**, fechando o
      caminho do legado em que data vazia escapava da regra de faixa e era gravada nula, e com
      o limite de 255 caracteres da descrição declarado com o mesmo número na aplicação e no
      esquema
      *satisfaz:* CA-1.2
      *depende de:* T001

- [x] **T004** Criar a migração versionada com a tabela de agendamento e o registro de
      mudanças de situação
      *entrega:* uma migração numerada, aplicável do zero, em que a mudança de situação é
      registrada **sem perder a anterior**, como `UT-021-1` exige; nenhum arquivo de criação de
      esquema fora do diretório de migrações
      *satisfaz:* — (infraestrutura exigida pelo princípio P5)
      *depende de:* T003

- [ ] **T005** [P] Implementar a validação de descrição e de presença da data
      *entrega:* a validação que recusa descrição em branco, descrição acima de 255 caracteres
      e data ausente, apontando o campo, com mensagem vinda do catálogo de traduções, e sem
      gravar nada
      *satisfaz:* CA-1.2
      *depende de:* T003

- [ ] **T006** Declarar a faixa de data aceitável **num único lugar** e usá-la tanto na
      validação quanto na preparação do formulário
      *entrega:* uma só declaração da faixa, de onde saem a data sugerida no formulário, o
      limite declarado no campo e o limite que a validação recusa, de modo que os três sejam o
      mesmo dia e mudar a regra num lugar e esquecer o outro quebre um teste. A data sugerida
      nasce na **preparação do formulário**, nunca no construtor da entidade, ao contrário do
      legado
      *satisfaz:* CA-1.3, CA-1.4, CA-3.3
      *depende de:* T002, T005

- [ ] **T007** Implementar a operação de agendar visita, terminando na ficha do dono
      *entrega:* o agendamento gravado vinculado ao animal, com o destino na ficha do dono, e
      nada gravado quando a validação recusa
      *satisfaz:* CA-1.1
      *depende de:* T006, e a resolução do animal pelo dono que a feature 003 entrega em T014

- [ ] **T008** Testes de agendamento de visita
      *entrega:* `UT-018-1` a `UT-018-7` passando, cobrindo caminho feliz, descrição em branco
      e acima do limite, data fora da faixa com mensagem traduzida no campo de data, o
      formulário com data sugerida e limite declarado, a descrição de 255 aceita e a de 256
      recusada, a data sugerida sendo o dia seguinte ao do relógio, e o limite do campo igual
      ao limite da validação
      *satisfaz:* CA-1.1, CA-1.2, CA-1.3, CA-1.4
      *depende de:* T007

- [ ] **T009** Implementar a listagem do histórico de visitas do animal no formulário de
      agendamento
      *entrega:* a lista em ordem crescente de data, estável para datas iguais, com data e
      descrição, **sem** a visita em preparação, e com a seção vazia acompanhada da mensagem
      que explica a ausência quando o animal não tem visita
      *satisfaz:* CA-2.1, CA-2.2, CA-2.3
      *depende de:* T003

- [ ] **T010** Fazer o rótulo da seção corresponder ao recorte que ela aplica
      *entrega:* ou o recorte exclui as visitas futuras e o rótulo fala de visitas anteriores,
      ou as duas aparecem e o rótulo fala do histórico, com o texto vindo do catálogo de
      traduções e **nunca** a combinação contrária. É o único critério do pacote que fixa a
      coerência entre um texto visível e o recorte de dados que ele descreve
      *satisfaz:* CA-2.4
      *depende de:* T009

- [ ] **T011** Testes do histórico de visitas no agendamento
      *entrega:* `UT-019-1` a `UT-019-6` passando, incluindo as três visitas fora de ordem
      devolvidas em ordem crescente, a visita em branco descartada sem perder nenhuma gravada,
      a seção vazia com mensagem, o rótulo coerente com o recorte, e a ordenação estável para
      datas iguais
      *satisfaz:* CA-2.1, CA-2.2, CA-2.3, CA-2.4
      *depende de:* T010

- [ ] **T012** Modelar o Atendimento como entidade própria, aceitando a data de hoje
      *entrega:* a entidade de atendimento separada do agendamento, conforme a decisão da
      Pergunta 1, com animal e data obrigatórios, aceitando a data de hoje, e com a migração
      versionada correspondente. A coluna de veterinário responsável é criada **anulável**
      (D01), e T021 a usa
      *satisfaz:* CA-3.1
      *depende de:* T004

- [ ] **T013** Testes da coerência da faixa de data
      *entrega:* `UT-020-1` a `UT-020-3` passando, incluindo a data sugerida sendo aceita pela
      validação qualquer que seja a faixa configurada, a data sugerida sendo o primeiro dia que
      a regra aceita, e o limite declarado no campo igual ao limite da validação
      *satisfaz:* CA-3.1, CA-3.3
      *depende de:* T012

- [ ] **T014** Implementar a situação do agendamento e o registro datado de cada mudança
      *entrega:* a mudança de situação que grava a situação nova e a data em que ocorreu
      **sem perder a anterior**, e a recusa de alterar um agendamento cuja situação já é
      atendida
      *satisfaz:* CA-4.1
      *depende de:* T012

- [ ] **T015** Distinguir na ficha do animal o que está agendado do que já foi atendido
      *entrega:* a ficha mostrando as duas coisas com distinção visível, com os rótulos vindos
      do catálogo de traduções
      *satisfaz:* CA-4.3
      *depende de:* T014

- [ ] **T016** Testes da situação e da imutabilidade do atendimento
      *entrega:* `UT-021-1` e `UT-021-5` passando, cobrindo a mudança de situação registrada
      com data sem perder a anterior e a recusa de alterar data ou descrição de uma visita já
      atendida. Os outros três testes do card, `UT-021-2`, `UT-021-3` e `UT-021-4`, dependem
      do conflito registrado em `Sem tarefa`
      *satisfaz:* CA-4.1
      *depende de:* T014

- [ ] **T017** Implementar a remarcação de um agendamento futuro
      *entrega:* data e descrição novas gravadas sobre um agendamento futuro, aparecendo por
      elas na ficha do dono, com as mesmas validações do agendamento e com a recusa quando a
      situação já é atendida
      *satisfaz:* CA-5.1
      *depende de:* T014

- [ ] **T018** Implementar o cancelamento de um agendamento futuro, **sem apagar nada**
      *entrega:* o agendamento passando à situação de cancelado com a data do cancelamento,
      saindo da contagem de compromissos, continuando consultável no histórico, e **nenhuma
      exclusão solicitada ao repositório**, como `UT-022-5` exige e o princípio P2 da
      constituição manda
      *satisfaz:* CA-5.2, CA-5.3
      *depende de:* T014

- [ ] **T019** Testes de remarcação e de cancelamento
      *entrega:* `UT-022-1` a `UT-022-5` passando, incluindo a alteração de data e descrição,
      o cancelamento com data e saída da contagem de compromissos, a visita cancelada ainda
      consultável, a recusa de remarcar e de cancelar o que já foi atendido, e nenhuma
      exclusão pedida ao repositório
      *satisfaz:* CA-5.1, CA-5.2, CA-5.3
      *depende de:* T017, T018

- [ ] **T020** Aceitar atendimento com data passada sem limite e recusar data futura
      *entrega:* a regra de data do atendimento num só lugar, com o relógio injetado: hoje e
      qualquer data passada aceitos, amanhã recusado com mensagem do catálogo (D06)
      *satisfaz:* CA-3.2
      *depende de:* T012

- [ ] **T021** Registrar o veterinário opcional no atendimento e a consulta por veterinário
      *entrega:* a escolha opcional entre os veterinários **ativos** (P-09), a gravação com e
      sem veterinário, e a consulta "quais animais este veterinário atendeu" sobre os
      atendimentos que o registraram; desligar o veterinário depois não apaga o vínculo.
      `UT-021-2`, `UT-021-3` e `UT-021-4` passando
      *satisfaz:* CA-4.2, CA-4.4
      *depende de:* T012

- [ ] **T022** Implementar as situações do agendamento e o pendente de registro
      *entrega:* as transições de D10 com recusa das inválidas (inclusive cancelar depois da
      data), a data de cada mudança registrada, o estado derivado "pendente de registro"
      calculado na leitura e destacado na ficha (D11), e a recusa de agendamento para animal
      Falecido ou Transferido (D09)
      *satisfaz:* CA-4.1, CA-4.5, CA-4.6
      *depende de:* T012

- [ ] **T023** Porta de notificação ao dono, com o envio pelo RabbitMQ
      *entrega:* a porta `NotificacaoAoDono`; a gravação do agendamento escreve a mensagem
      numa caixa de saída na **mesma transação**, e um publicador a leva ao RabbitMQ; o
      consumidor envia com retentativa e fila de descarte. Dono sem consentimento (D12) não
      recebe mensagem e a gravação não falha. O adaptador padrão é o falso, que registra em
      log
      *satisfaz:* — (infraestrutura de D12)
      *depende de:* T022

- [ ] **T024** Confirmação ao agendar e lembrete no D-1
      *entrega:* a mensagem de confirmação publicada ao agendar; um comando
      `lembretes:d-1`, executado por um `CronJob` diário, que publica um lembrete por
      agendamento de amanhã ainda Agendado. Cancelado não recebe lembrete. Rodar o comando
      duas vezes no mesmo dia não duplica envio (chave de idempotência por agendamento e tipo)
      *satisfaz:* — (D12)
      *depende de:* T023

- [ ] **T025** Adaptador da Meta Cloud API
      *entrega:* o adaptador real, com os dois templates parametrizados e as credenciais lidas
      de `Secret` (P-13), selecionado por configuração. Em homologação, usa o número de
      teste da Cloud API (D28); em produção, só é ligado depois da conta verificada e dos
      templates aprovados
      *satisfaz:* — (D12)
      *depende de:* T023

- [ ] **T026** Campos clínicos do atendimento
      *entrega:* queixa principal, peso, diagnóstico, conduta e data de retorno, com os
      limites de D26 nos dois lados (P3) e o teste de máximo e máximo mais um de cada campo;
      a data de retorno aparece na ficha como sugestão de agendamento, sem criar agendamento
      *satisfaz:* CA-4.7
      *depende de:* T012

- [ ] **T027** Templates e horário do WhatsApp
      *entrega:* os dois templates de D28 com o mapeamento de variáveis testado (a ordem é
      diferente entre os dois), o nome e o telefone da clínica vindos de configuração, e o
      `CronJob` às 10:00 de `America/Sao_Paulo` (D29). Teste: o agendamento criado às 11h
      para amanhã não recebe lembrete, e o criado às 9h recebe
      *satisfaz:* — (D28, D29)
      *depende de:* T024

## Sem tarefa

Nenhum critério ficou sem tarefa. CA-3.2 ganhou regra em D06, CA-4.2 e CA-4.4 foram
arbitrados em D01, e as situações e a passagem do tempo foram decididas em D10 e D11.
Os campos do atendimento foram decididos em D26 e são entregues por T026.
