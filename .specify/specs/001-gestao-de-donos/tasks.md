# Tarefas, Gestão de donos

> Ordem de dependência. `[P]` marca tarefas que podem rodar em paralelo por tocarem
> arquivos diferentes.
>
> A coluna *satisfaz* aponta o critério de aceite do `spec.md`. Tarefa sem critério é
> infraestrutura, e está dito nela. Os identificadores `UT-nnn-n` são os testes que os
> cards do backlog já traziam, preservados como tarefa de teste própria.

- [ ] **T001** Declarar o nome de toda coluna do Dono no mapeamento, sem depender de
      estratégia automática de nomenclatura
      *entrega:* o mapeamento do Dono com nome de coluna explícito em cada campo, incluindo
      os campos novos de versão, criação e alteração
      *satisfaz:* — (infraestrutura exigida pelo princípio P3 da constituição e pela
      decisão da Pergunta 14)

- [ ] **T002** Escrever o teste que compara, campo por campo, o nome declarado no mapeamento
      com o nome presente na migração de esquema
      *entrega:* um teste que falha se qualquer coluna do Dono passar a depender de
      derivação automática de nome
      *satisfaz:* — (infraestrutura, P3)
      *depende de:* T001

- [x] **T003** Modelar o Dono com os cinco campos de contato, a marca de versão e as datas de
      criação e de alteração
      *entrega:* a entidade Dono com nome, sobrenome, endereço, cidade, telefone, versão,
      criação e alteração, e os limites de tamanho de 30, 30, 255 e 80 declarados
      *satisfaz:* CA-1.3
      *depende de:* T001

- [ ] **T004** Criar a primeira migração versionada de esquema, com a tabela de donos
      *entrega:* uma migração numerada que cria a tabela, aplicável do zero, e nenhum arquivo
      de criação de esquema fora do diretório de migrações
      *satisfaz:* — (infraestrutura exigida pelo princípio P5)
      *depende de:* T003

- [x] **T005** [P] Implementar a validação de obrigatoriedade e de tamanho dos cinco campos,
      válida igualmente na criação e na alteração
      *entrega:* a validação que recusa campo obrigatório vazio e campo acima do limite,
      apontando o campo, sem gravar nada
      *satisfaz:* CA-1.2, CA-1.3, CA-4.3
      *depende de:* T003

- [x] **T006** [P] Implementar a regra de formato de telefone num único ponto, configurável,
      com a mensagem vinda do catálogo de traduções
      *entrega:* a regra de celular brasileiro (D05) isolada em um só lugar, com o valor gravado
      normalizado em E.164 quando ela é satisfeita e recusado no próprio campo quando não é
      *satisfaz:* CA-2.1, CA-2.2
      *depende de:* T003

- [ ] **T007** Implementar a operação de criar dono, terminando na ficha do dono criado
      *entrega:* a criação que grava o dono e devolve o identificador e a ficha dele, e que
      não grava nada quando a validação recusa
      *satisfaz:* CA-1.1, CA-1.4
      *depende de:* T005, T006

- [ ] **T008** Testes de criação de dono
      *entrega:* `UT-001-1` a `UT-001-7` e `UT-002-1` a `UT-002-3` passando, cobrindo caminho
      feliz, os cinco obrigatórios isolados, o valor no limite, o primeiro acima do limite, a
      base intacta após recusa, o destino após a escrita e o telefone válido e inválido
      *satisfaz:* CA-1.1, CA-1.2, CA-1.3, CA-1.4, CA-2.1, CA-2.2
      *depende de:* T007

- [ ] **T009** Definir o objeto de entrada de alteração com semântica declarada de alteração
      parcial
      *entrega:* o contrato de entrada em que campo ausente significa não alterar, campo
      presente e vazio significa limpar e nesse caso a obrigatoriedade reprova, mais o teste
      dos três casos da tabela da Pergunta 22
      *satisfaz:* CA-4.2, CA-4.3
      *depende de:* T005

- [ ] **T010** Implementar a abertura e a gravação da alteração do dono
      *entrega:* o formulário de edição carregado com os valores atuais, a gravação que mantém
      o mesmo identificador e termina na ficha, e a recusa quando o dono do corpo não é o
      dono pedido
      *satisfaz:* CA-4.1, CA-4.2, CA-4.4
      *depende de:* T009

- [ ] **T011** Implementar a marca de versão e a recusa de gravação com versão vencida
      *entrega:* a segunda gravação concorrente recusada com aviso de cadastro alterado, os
      valores digitados preservados e os valores atuais entregues ao lado deles; edição sem
      concorrência grava sem aviso
      *satisfaz:* CA-5.1, CA-5.2, CA-5.3
      *depende de:* T010

- [ ] **T012** Implementar a leitura da ficha do dono, com o histórico de visitas paginado
      dentro dela
      *entrega:* a ficha com os cinco campos de contato, os animais em ordem alfabética, as
      visitas de cada animal em ordem crescente de data e paginadas, os atalhos de edição,
      de novo animal, de edição de animal e de agendamento, e nenhuma gravação
      *satisfaz:* CA-6.1, CA-6.2, CA-6.3, CA-6.4, CA-6.5
      *depende de:* T003

- [ ] **T013** Testes de alteração, de concorrência e de leitura da ficha
      *entrega:* `UT-004-1` a `UT-004-7`, `UT-005-1` a `UT-005-4` e `UT-006-1` a `UT-006-7`
      passando, incluindo a preservação dos animais e visitas após alterar só o contato, a
      comparação de versão antes de aceitar e a ordenação estável de visitas de data igual
      *satisfaz:* CA-4.1, CA-4.2, CA-4.3, CA-4.4, CA-5.1, CA-5.2, CA-5.3, CA-6.1, CA-6.2,
      CA-6.3, CA-6.4, CA-6.5
      *depende de:* T011, T012

- [ ] **T014** Publicar a mensagem de resultado na mesma resposta da operação
      *entrega:* confirmação de gravação de dono, animal e visita e mensagem de erro de
      gravação viajando na resposta da própria requisição, junto do formulário que a produziu
      *satisfaz:* CA-7.1, CA-7.2
      *depende de:* T012

- [ ] **T015** Teste de interface do tempo de vida da mensagem de resultado
      *entrega:* `UT-007-3` e `UT-007-4` passando contra a página renderizada, cobrindo a
      mensagem ativa no limite do tempo, inativa no instante seguinte, e nenhum agendamento
      quando não existe mensagem a esconder. **É teste de interface, não de unidade**: a
      metade do critério que fala do comportamento na tela não é verificável por unidade
      *satisfaz:* CA-7.3
      *depende de:* T014

- [ ] **T016** Teste de integração de edição concorrente, com dois processos sobre o mesmo
      banco
      *entrega:* um teste de integração que abre a mesma ficha em duas sessões, grava nas
      duas em sequência e espera que a segunda seja recusada. **Não é verificável por teste
      de unidade**: a corrida real precisa de dois processos e de um banco. Compartilha a
      infraestrutura com a tarefa equivalente da feature 003
      *satisfaz:* CA-5.1
      *depende de:* T011

- [ ] **T017** Implementar o aviso de dono parecido dispensável e a proteção contra dupla
      submissão do formulário
      *entrega:* o aviso que nunca bloqueia por conta própria, a confirmação explícita que
      grava e registra que o aviso foi dispensado, e a garantia de que dois envios do mesmo
      formulário produzem um só dono
      *satisfaz:* CA-3.2, CA-3.3
      *depende de:* T007

- [ ] **T018** Testes do aviso de similaridade e da dupla submissão
      *entrega:* `UT-003-1` a `UT-003-3` passando, incluindo dois donos homônimos com contatos
      distintos aceitos sem alarme e a coincidência tratada como indício, nunca como identidade
      *satisfaz:* CA-3.2, CA-3.3
      *depende de:* T017

- [ ] **T019** Acrescentar ao Dono o CPF, o e-mail e o consentimento de mensagens, com a
      migração e o índice único parcial do CPF
      *entrega:* os três campos no mapeamento com nome declarado (P3), a validação do dígito
      verificador e do formato do e-mail, e a violação de unicidade do CPF reconhecida pelo
      tipo e devolvida como erro do campo
      *satisfaz:* CA-1.5, CA-1.6, CA-1.7, CA-1.8
      *depende de:* T004, T005

- [ ] **T020** Testes de CPF, e-mail e consentimento
      *entrega:* CPF válido, CPF com dígito verificador errado, CPF repetido (inclusive em
      gravação concorrente contra o banco real), CPF de dono anonimizado liberado para reuso,
      e-mail ausente, inválido, com 254 e com 255 caracteres, e consentimento desmarcado por
      padrão
      *satisfaz:* CA-1.5, CA-1.6, CA-1.7, CA-1.8
      *depende de:* T019

- [ ] **T021** Testes da regra de celular com os valores de D05
      *entrega:* o válido `(11) 98765-4321` gravado como `+5511987654321`, e os inválidos
      `1234567890` e `(11) 3456-7890` recusados no campo
      *satisfaz:* CA-2.1, CA-2.3
      *depende de:* T006

- [ ] **T022** Implementar e testar o aviso de dono parecido pelo celular
      *entrega:* ao confirmar um cadastro ou uma alteração cujo celular já pertence a outro
      dono, o candidato é apresentado antes de gravar; a confirmação explícita grava (T017).
      Dois homônimos com celulares distintos não disparam aviso
      *satisfaz:* CA-3.1, CA-3.3
      *depende de:* T017

## Sem tarefa

Nenhum critério ficou sem tarefa. Os dois que estavam aqui (CA-2.3 e CA-3.1) ganharam
valor concreto em `memory/decisoes.md` D05 e D14, e são entregues por T021 e T022.
