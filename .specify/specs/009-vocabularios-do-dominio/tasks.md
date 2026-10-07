# Tarefas, Vocabulários do domínio

> Ordem de dependência. `[P]` marca tarefas que podem rodar em paralelo por tocarem
> arquivos diferentes.
>
> A coluna *satisfaz* aponta o critério de aceite do `spec.md`. Tarefa sem critério é
> infraestrutura, e está dito nela. Os identificadores `UT-nnn-n` são os testes que os
> cards do backlog já traziam, preservados como tarefa de teste própria.

- [x] **T001** Acrescentar situação à Espécie e ao Veterinário, por migração versionada
      *entrega:* a coluna de situação nas duas entidades, com todo registro existente nascendo
      ativo, e a migração numerada correspondente. É o campo que `UT-045-7` e `UT-046-8` exigem
      para que retirar do uso e desligar não sejam exclusão
      *satisfaz:* — (infraestrutura, pré-requisito de CA-1.3 e CA-2.4)
      *depende de:* as features 003 e 005 terem a Espécie e o Veterinário modelados e migrados

- [x] **T002** Criar a superfície administrativa de manutenção do vocabulário de espécies,
      **separada da superfície de leitura**
      *entrega:* uma superfície própria, com a permissão exigida declarada nela, de modo que a
      superfície de leitura continue sem operação de escrita alguma. Acrescentar escrita na
      interface que a tela pública usa satisfaria esta feature e **quebraria** `UT-025-3` e
      `UT-026-3` da feature 005, sem que nada avisasse
      *satisfaz:* — (infraestrutura, pré-requisito de CA-1.1, CA-1.2 e CA-1.3)
      *depende de:* T001, e a identidade que a feature 007 entrega em T003

- [x] **T003** Implementar a inclusão de espécie, recusando nome repetido inclusive com outra
      caixa
      *entrega:* a espécie incluída e **imediatamente disponível** para escolha no cadastro de
      animal, sem reinício e sem comando no banco, e a inclusão de um nome que difere do
      existente apenas pela caixa recusada como repetida, em vez de criar uma espécie
      equivalente
      *satisfaz:* CA-1.1
      *depende de:* T002

- [x] **T004** [P] Implementar a renomeação de espécie, mantendo os animais vinculados
      *entrega:* a espécie com o nome novo e os animais já cadastrados ainda vinculados a ela,
      porque o vínculo é por identificador e o nome é chave funcional apenas no formulário
      (ADR-0009). A consequência a conhecer, e não a evitar: renomear **muda o valor que o
      formulário envia**
      *satisfaz:* CA-1.2
      *depende de:* T002

- [x] **T005** [P] Implementar a resolução da espécie escolhida sem exigir grafia exata
      *entrega:* a resolução que aceita o nome capitalizado, em maiúsculas e **com espaços nas
      pontas**, levando os três à mesma espécie do vocabulário. É a continuação de T011 da
      feature 003, que resolve pelo nome: aqui entra a tolerância de grafia que o card pede
      *satisfaz:* CA-1.4
      *depende de:* T002

- [x] **T006** Implementar a recusa de remoção de espécie em uso, e a retirada do uso sem
      exclusão
      *entrega:* a tentativa de remover uma espécie com animal vinculado **sempre recusada**,
      com explicação do motivo vinda do catálogo de traduções, e a espécie continuando no
      vocabulário; mais a operação de retirar do uso, que a tira das opções do formulário e
      **não solicita exclusão alguma** ao repositório
      *satisfaz:* CA-1.3
      *depende de:* T003

- [x] **T007** Testes da manutenção do vocabulário de espécies
      *entrega:* `UT-045-1` a `UT-045-7` passando, cobrindo a sétima espécie disponível na
      montagem seguinte, os três animais ainda vinculados depois da renomeação, a remoção da
      espécie em uso recusada com explicação, as três grafias resolvendo para a mesma espécie,
      a enumeração das operações mostrando inclusão e renomeação, o nome repetido com outra
      caixa recusado, e **nenhuma exclusão solicitada** ao retirar do uso
      *satisfaz:* CA-1.1, CA-1.2, CA-1.3, CA-1.4
      *depende de:* T004, T005, T006

- [x] **T008** Criar a superfície administrativa de manutenção do quadro de veterinários,
      **separada da superfície de leitura**, com a invalidação da memória do catálogo
      *entrega:* a superfície própria, com a permissão exigida declarada nela; a inclusão de
      veterinário com nome e sobrenome e zero, uma ou várias especialidades; a alteração do
      conjunto de especialidades; o desligamento que tira do catálogo **sem solicitar exclusão
      alguma**; e **cada uma das três escritas** provocando o descarte da memória do catálogo,
      que é o par de CA-3.1 da feature 005 visto do lado da escrita.
      *entrega parcial, dita de propósito:* a segunda metade de CA-2.4, "sem que o histórico que
      o menciona seja perdido", **não tem sujeito hoje**: nada no sistema menciona um
      veterinário, porque a visita não registra quem atendeu, e isso é o conflito de US-4 da
      feature 004. A linha é preservada e o desligado sai do catálogo; o resto fica quando o
      conflito for arbitrado
      *satisfaz:* CA-2.1, CA-2.2, CA-2.4, CA-2.5
      *depende de:* T001, e a identidade que a feature 007 entrega em T003

- [x] **T009** Exercitar a restrição de unicidade do par veterinário e especialidade
      *entrega:* a atribuição da mesma especialidade duas vezes ao mesmo veterinário recusada,
      com o conjunto dele continuando com uma única ocorrência. A restrição **nomeada** já nasce
      em T003 da feature 005, pela decisão da Pergunta 6; esta tarefa é a primeira do sistema a
      tentar escrever o par repetido, porque no legado não havia caminho de escrita nenhum e a
      restrição existia em dois dialetos sem nunca ser exercitada.
      *entrega parcial, dita de propósito:* a metade de CA-2.3 que pede a recusa "em nenhum
      banco homologado" só se verifica depois de a lista existir. Enquanto houver um único
      dialeto eleito pelo princípio P5, o teste roda sobre ele. É a mesma pendência de CA-2.4 da
      feature 003
      *satisfaz:* CA-2.3
      *depende de:* T008

- [x] **T010** Testes da manutenção do quadro de veterinários
      *entrega:* `UT-046-1`, `UT-046-2`, `UT-046-3`, `UT-046-5`, `UT-046-6`, `UT-046-7` e
      `UT-046-8` passando, cobrindo os três veterinários com zero, uma e três especialidades, o
      conjunto novo exato depois da alteração, o par repetido recusado, um descarte de memória
      por escrita, o nome e o sobrenome ausentes recusados no campo que falta, o veterinário com
      zero especialidade gravado e com marca de ausência no catálogo, e **nenhuma exclusão
      solicitada** ao desligar. `UT-046-4` fica de fora, e o motivo está em T008 e em `Sem
      tarefa`
      *satisfaz:* CA-2.1, CA-2.2, CA-2.3, CA-2.4, CA-2.5
      *depende de:* T009

## Sem tarefa

**Nenhum dos 9 critérios de aceite desta feature ficou sem tarefa.** Dois são entregues de
forma declaradamente parcial, e os motivos estão escritos nas tarefas:

- **CA-2.3**, a recusa do par repetido "em nenhum banco homologado", é entregue por T009 sobre
  o dialeto eleito. A lista de bancos homologados não existe, porque o princípio P5 da
  constituição manda eleger um único e a decisão não foi tomada. A metade estrutural, a
  restrição nomeada que recusa o par, nasce em T003 da feature 005.
- **CA-2.4**, o desligado saindo do catálogo "sem que o histórico que o menciona seja perdido",
  é entregue por T008 na primeira metade. A segunda **não tem sujeito**: nada no sistema
  menciona um veterinário, porque a visita não registra quem atendeu. Isso é o conflito de US-4
  da feature 004, entre a resposta da Pergunta 2, que mantém o veterinário fora da operação, e
  os critérios daquele card. O teste `UT-046-4` do card pede, no seu `given`, "um veterinário
  mencionado em atendimentos registrados", e esse estado é impossível de montar hoje: é o único
  teste de todo o pacote que o conflito de outra feature torna inexecutável.

Uma pendência que **não** bloqueia critério: o conjunto de situações da espécie e do
veterinário. T001 cria as duas colunas com a distinção mínima que os critérios exigem, ativo e
fora de uso ou desligado. O conjunto completo e as transições estão em Perguntas em aberto, e
quando vierem atingem T001, T006, T008 e três tarefas da feature 005.
