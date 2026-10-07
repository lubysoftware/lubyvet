# Tarefas, Acesso, identidade e dados pessoais

> Ordem de dependência. `[P]` marca tarefas que podem rodar em paralelo por tocarem
> arquivos diferentes.
>
> A coluna *satisfaz* aponta o critério de aceite do `spec.md`. Tarefa sem critério é
> infraestrutura, e está dito nela. Os identificadores `UT-nnn-n` são os testes que os
> cards do backlog já traziam, preservados como tarefa de teste própria.
>
> Dois dos catorze critérios desta feature **não têm tarefa**, por conflito entre decisões
> humanas. Um terceiro é entregue com uma exceção declarada, pelo mesmo motivo. Ver a seção
> `Sem tarefa` no fim.

- [x] **T001** Declarar, em arquivo do projeto, o inventário dos caminhos que leem ou escrevem
      dado pessoal
      *entrega:* a lista dos caminhos, derivada dos 17 pares de método e rota que
      `permissions.md` enumera um a um, marcando cada um como de leitura, de escrita ou de dado
      não pessoal. É o insumo de T006 e de T007, e é o ativo mais útil da análise para esta
      feature
      *satisfaz:* — (infraestrutura, pré-requisito de CA-1.1, CA-1.4 e CA-2.3)

- [x] **T002** Modelar a identidade e os três papéis (D17, D18)
      *entrega:* a identidade com credencial guardada de forma irreversível, papel e situação,
      mais a migração versionada correspondente: a identidade é tabela própria no PostgreSQL,
      com hash argon2id (D17). Os papéis são três: Leitura, Escrita e Administrador (D18)
      *satisfaz:* — (infraestrutura, pré-requisito de todo o resto da feature)

- [x] **T003** Implementar a autenticação com recusa genérica
      *entrega:* a autenticação cuja recusa é **indistinguível** entre credencial errada e
      usuário inexistente, em mensagem e em qualquer outro sinal observável, incluindo tempo de
      resposta
      *satisfaz:* CA-1.2
      *depende de:* T002

- [x] **T004** Declarar a matriz de ações por papel em um único arquivo
      *entrega:* a declaração de quais ações cada um dos dois papéis permite, de modo que
      acrescentar uma ação em **um** lugar já a torne visível a quem decide. A matriz do legado
      tinha uma linha e zero controle; esta tem duas linhas e é declaração, não dado
      *satisfaz:* CA-2.1
      *depende de:* T001, T002

- [x] **T005** Implementar a decisão de autorização, recusando por padrão
      *entrega:* a decisão que permite **por declaração** e recusa em todos os outros casos,
      incluindo identidade sem papel algum, em vez de tratar ausência de regra como permissão.
      A recusa não distingue dado existente de inexistente
      *satisfaz:* CA-2.2
      *depende de:* T004

- [x] **T006** Exigir identificação em todo caminho do inventário, **sem exceção** (D04)
      *entrega:* a exigência de identificação aplicada antes de qualquer leitura, de modo que
      nenhum dado pessoal seja lido para depois ser descartado, em todos os caminhos de T001.
      A listagem completa da base de clientes também exige login: a exceção da Pergunta 9
      foi removida por D04
      *satisfaz:* CA-1.1
      *depende de:* T003, T005

- [x] **T007** Escrever o teste de acesso não identificado a partir da **lista** de caminhos
      *entrega:* um teste que percorre o inventário de T001 e exige recusa em cada caminho, de
      modo que um caminho novo acrescentado à lista nasça coberto. É a mesma técnica de
      `UT-017-3` na feature 003, e existe porque no legado não havia **um único** teste de
      permissão
      *satisfaz:* CA-1.4
      *depende de:* T006

- [x] **T008** [P] Implementar a expiração da sessão por inatividade
      *entrega:* a sessão que, no limite do tempo configurado, ainda vale, e no instante
      seguinte já não é aceita, com relógio injetável
      *satisfaz:* CA-1.3
      *depende de:* T003

- [x] **T009** Implementar a anonimização do dono, alcançando **todos** os caminhos de leitura
      *entrega:* a operação que, por um caminho do próprio sistema, retira nome, sobrenome,
      endereço, cidade e telefone do dono, mais o e-mail e o documento se existirem, e a
      garantia de que nenhum caminho de leitura devolve mais esses valores. **Inclui os
      caminhos de busca da feature 002**: um dono anonimizado não pode continuar encontrável
      pelo sobrenome que ele não tem mais, e esse é o furo mais provável do critério
      *satisfaz:* CA-3.1, CA-3.2
      *depende de:* T006

- [x] **T010** Preservar animais e visitas do dono anonimizado, desvinculados da identificação
      *entrega:* os animais e as visitas continuando a existir depois da operação, sem que
      nenhum deles permita voltar à identificação da pessoa, e **nenhuma exclusão solicitada ao
      repositório**, como `UT-035-4` exige e o princípio P2 da constituição manda
      *satisfaz:* CA-3.3
      *depende de:* T009

- [x] **T011** Registrar a operação de anonimização, com data e executor identificado
      *entrega:* o registro da operação com o momento do relógio e a identidade de quem
      executou, em registro próprio e não no Dono, mais a recusa da operação quando não há
      executor identificado
      *satisfaz:* CA-3.4
      *depende de:* T009

- [x] **T012** Testes da anonimização
      *entrega:* `UT-035-1` a `UT-035-5` passando, cobrindo o dono deixando de carregar os
      valores sem acesso direto ao banco, os dois animais e as três visitas preservados sem
      caminho de volta à pessoa, o registro com momento e executor, nenhuma exclusão de animal
      nem de visita solicitada, e o pedido sem identificação recusado sem alterar nada
      *satisfaz:* CA-3.1, CA-3.2, CA-3.3, CA-3.4
      *depende de:* T010, T011

- [x] **T013** Fechar todo caminho de escrita anônimo
      *entrega:* nenhuma operação de gravação de dono, de animal ou de visita aceitando pedido
      sem identidade, e os campos de auditoria vindos de fora **ignorados**, de modo que um
      formulário que tente enviar momento próprio não consiga. A segunda metade é a extensão da
      proteção contra atribuição em massa que o legado já tinha (ADR-0008) aos campos novos
      *satisfaz:* CA-4.3
      *depende de:* T005

- [x] **T014** Testes de autorização por papel, para cada caminho de escrita
      *entrega:* `UT-034-1` a `UT-034-3` passando, incluindo as ações de cada papel vindas da
      mesma declaração, a ação fora do papel recusada com resposta que não distingue dado
      existente de inexistente, e a identidade sem papel recusada em vez de permitida por
      ausência de regra. O teste percorre a lista de caminhos de escrita de T001, não caminho
      por caminho
      *satisfaz:* CA-2.1, CA-2.2, CA-2.3
      *depende de:* T005

- [x] **T015** Testes da exigência de identificação e da autenticação
      *entrega:* `UT-033-1` a `UT-033-4` passando, cobrindo o pedido sem identificação recusado
      **antes de qualquer leitura**, as duas recusas de credencial indistinguíveis, a sessão
      válida no limite do tempo e inválida no instante seguinte, e as três gravações sem
      identificação recusadas sem nenhuma chegar ao repositório. O teste declara a exceção da
      listagem de T006 de forma explícita, em vez de simplesmente não cobri-la
      *satisfaz:* CA-1.1, CA-1.2, CA-1.3
      *depende de:* T007, T008, T013

- [ ] **T016** Teste da inexistência de caminho de escrita anônimo e da imutabilidade dos
      campos de auditoria
      *entrega:* `UT-036-3` passando, com a gravação sem identidade recusada e nada gravado,
      mais o teste de que autoria e momento enviados de fora são ignorados. Os outros quatro
      testes do card REQ-036 dependem do conflito registrado em `Sem tarefa`
      *satisfaz:* CA-4.3
      *depende de:* T013

- [ ] **T017** Colunas de autoria em dono, animal, agendamento e atendimento
      *entrega:* `created_by` e `updated_by` (referência ao usuário, D02) preenchidos pelo
      caso de uso a partir da identidade da requisição, nunca a partir do corpo; o valor
      vindo de fora é ignorado (o mesmo mecanismo de T013)
      *satisfaz:* CA-4.1
      *depende de:* T013

- [ ] **T018** Consulta de autoria por cadastro e testes
      *entrega:* quem criou, quem alterou por último e quando, visíveis na ficha para todos os
      papéis; nenhum caminho normal altera a autoria. `UT-036-1`, `UT-036-2`, `UT-036-4` e
      `UT-036-5` passando
      *satisfaz:* CA-4.1, CA-4.2
      *depende de:* T017

- [x] **T019** Revisão de texto livre na anonimização
      *entrega:* a lista de textos livres do dono anonimizado com nome, sobrenome, CPF,
      celular e e-mail destacados (comparação sem caixa, acento nem máscara); a confirmação por
      trecho que troca por `[removido]`; a marca de revisão pendente no dono; e o registro da
      revisão com data e Administrador. Testes: telefone com outra máscara é destacado, texto
      clínico fora do trecho fica intacto, e Escrita e Leitura não acessam a revisão
      *satisfaz:* CA-3.5
      *depende de:* T009, T011

## Sem tarefa

Nenhum critério ficou sem tarefa. CA-4.1 e CA-4.2 foram arbitrados em D02 (autoria por
pessoa), e a exceção de CA-1.1 foi removida em D04.
