# Tarefas, Animais do dono

> Ordem de dependência. `[P]` marca tarefas que podem rodar em paralelo por tocarem
> arquivos diferentes.
>
> A coluna *satisfaz* aponta o critério de aceite do `spec.md`. Tarefa sem critério é
> infraestrutura, e está dito nela. Os identificadores `UT-nnn-n` são os testes que os
> cards do backlog já traziam, preservados como tarefa de teste própria.

- [x] **T001** Declarar o nome de toda coluna do Animal e da Espécie no mapeamento, sem
      depender de estratégia automática de nomenclatura
      *entrega:* o mapeamento das duas entidades com nome de coluna explícito em cada campo,
      incluindo a coluna de dono do animal, que no legado não tinha campo correspondente
      *satisfaz:* — (infraestrutura exigida pelo princípio P3 da constituição e pela decisão
      da Pergunta 14)
      *depende de:* a feature 001 ter o Dono modelado e migrado

- [x] **T002** Escrever o teste que compara, campo por campo, o nome declarado no mapeamento
      do Animal e da Espécie com o nome presente na migração de esquema
      *entrega:* um teste que falha se qualquer coluna das duas entidades passar a depender de
      derivação automática de nome
      *satisfaz:* — (infraestrutura, P3)
      *depende de:* T001

- [x] **T003** Modelar a Espécie com nome único, resolução insensível à caixa, e carregar o
      vocabulário de seis valores
      *entrega:* a entidade Espécie com o nome declarado único, a carga inicial dos seis
      valores do legado, e a garantia de que duas espécies que diferem só pela caixa não
      coexistem
      *satisfaz:* CA-1.4
      *depende de:* T001

- [x] **T004** [P] Modelar o Animal com nome, data de nascimento, espécie, dono, marca de
      versão e datas de criação e de alteração
      *entrega:* a entidade Animal com o limite de 30 caracteres no nome declarado, o dono e a
      espécie obrigatórios nos dois lados, e a coleção de visitas que CA-3.3 obriga a preservar
      *satisfaz:* CA-1.5
      *depende de:* T001

- [x] **T005** Criar a migração versionada com as tabelas de animal e de espécie, e a
      restrição de unicidade **nomeada** do par dono e nome
      *entrega:* uma migração numerada, aplicável do zero, com a restrição de unicidade
      declarada com nome próprio e explicitamente insensível à caixa, em vez de depender do
      tipo da coluna; nenhum arquivo de criação de esquema fora do diretório de migrações
      *satisfaz:* — (infraestrutura exigida pelo princípio P5, e pré-requisito de CA-2.4)
      *depende de:* T003, T004

- [x] **T006** [P] Implementar a validação de nome, de tamanho e de data de nascimento,
      declarada em um só lugar e válida igualmente na criação e na alteração
      *entrega:* a validação que recusa nome em branco, nome acima de 30 caracteres, data de
      nascimento ausente e data de nascimento futura, apontando o campo, com mensagem vinda do
      catálogo de traduções, e sem gravar nada
      *satisfaz:* CA-1.2, CA-1.3, CA-3.4
      *depende de:* T004

- [x] **T007** [P] Implementar a obrigatoriedade da espécie, declarada em um só lugar e sem
      distinguir criação de alteração
      *entrega:* a regra que recusa espécie ausente antes de qualquer tentativa de gravação,
      com erro no campo de espécie, produzida pela mesma declaração nos dois caminhos. É a
      arbitragem da contradição C1 em favor do banco, decidida na Pergunta 5
      *satisfaz:* CA-4.1, CA-4.2, CA-4.3
      *depende de:* T004

- [x] **T008** Implementar a verificação preventiva de nome de animal já usado, no escopo do
      dono e ignorando a caixa
      *entrega:* a verificação que consulta **apenas** os animais daquele dono, trata nomes
      que diferem só pela caixa como o mesmo nome, e aceita a gravação quando o nome em
      conflito é o do próprio animal, comparando os identificadores
      *satisfaz:* CA-2.1, CA-2.2, CA-2.5
      *depende de:* T005, T006

- [x] **T009** Implementar o reconhecimento da violação de unicidade **pelo tipo do erro**, e
      a tradução dele em erro no campo nome
      *entrega:* a tradução que produz a mensagem de nome já em uso tanto quando a violação
      traz o nome da restrição quanto quando a mensagem é anônima, sem jamais inspecionar o
      texto devolvido pelo banco. É a arbitragem da contradição C2
      *satisfaz:* CA-2.3
      *depende de:* T008

- [x] **T010** Implementar a operação de cadastrar animal, terminando na ficha do dono
      *entrega:* o cadastro que grava o animal vinculado àquele dono, com exatamente um dono e
      exatamente uma espécie, devolve o identificador criado e termina na ficha do dono, e que
      não grava nada quando a validação recusa
      *satisfaz:* CA-1.1, CA-1.5
      *depende de:* T006, T007, T009

- [x] **T011** Implementar a resolução da espécie pelo nome, contra o vocabulário fechado
      *entrega:* a resolução que aceita o nome em qualquer caixa, recusa qualquer valor fora
      do vocabulário com erro **no campo de espécie**, e nunca deixa falha de conversão vazar
      para a tela
      *satisfaz:* CA-1.4
      *depende de:* T003

- [x] **T012** Testes de cadastro de animal
      *entrega:* `UT-013-1` a `UT-013-8` passando, cobrindo caminho feliz, as quatro faltas
      isoladas com mensagem traduzida, a data de amanhã recusada no campo de data, a sétima
      espécie recusada no campo de espécie, o animal com um dono e uma espécie, o nome de 30 e
      o de 31 caracteres, a espécie com outra caixa resolvida para o mesmo valor, e a data em
      formato diferente produzindo erro de campo e não falha de conversão
      *satisfaz:* CA-1.1, CA-1.2, CA-1.3, CA-1.4, CA-1.5
      *depende de:* T010, T011

- [x] **T013** Escrever os testes do isolamento entre donos, **antes** da implementação da
      resolução do animal
      *entrega:* `UT-017-1` a `UT-017-6` passando contra a resolução que T014 entrega,
      incluindo o teste que percorre a **lista** dos caminhos que recebem dono e animal juntos
      e o teste que falha especificamente quando a resolução deixa de passar pelo dono. A
      ordem é exigência do princípio P1 da constituição e da decisão da Pergunta 23
      *satisfaz:* CA-5.1, CA-5.2, CA-5.3, CA-5.4
      *depende de:* T004

- [x] **T014** Implementar a resolução do animal **pelo dono informado**, respondendo "não
      encontrado" quando o par não combina
      *entrega:* a resolução única usada por todo caminho que recebe dono e animal, que
      responde "não encontrado" sem expor nenhum campo do animal quando o dono informado não é
      o dele, e que mantém funcionando o caminho legítimo
      *satisfaz:* CA-5.1, CA-5.2, CA-5.4
      *depende de:* T013

- [x] **T015** Implementar a abertura e a gravação da alteração do animal
      *entrega:* o formulário de edição carregado com os três valores atuais e a espécie
      marcada, a gravação que mantém o mesmo identificador e termina na ficha do dono, e a
      coleção de visitas preservada em número e conteúdo
      *satisfaz:* CA-3.1, CA-3.2, CA-3.3
      *depende de:* T010, T014

- [x] **T016** Testes de alteração de animal
      *entrega:* `UT-015-1` a `UT-015-6` passando, incluindo as três visitas intactas depois
      de alterar nome e data de nascimento, o identificador mantido, as mesmas validações do
      cadastro na edição, o nome de 30 aceito e o de 31 recusado, e o destino na ficha do dono
      *satisfaz:* CA-3.1, CA-3.2, CA-3.3, CA-3.4
      *depende de:* T015

- [x] **T017** Testes da obrigatoriedade da espécie, pela **requisição** e não pelo
      formulário renderizado
      *entrega:* `UT-016-1` a `UT-016-5` passando, incluindo a edição com espécie vazia
      recusada com mensagem traduzida, nenhuma gravação chegando ao repositório, a mesma
      declaração produzindo o erro na criação e na edição, e nenhuma exceção para o animal já
      gravado. **É teste de requisição montada**, porque o caminho não é alcançável pela tela:
      a lista de espécies do legado não tinha opção vazia (nota do Revisor na Pergunta 5)
      *satisfaz:* CA-4.1, CA-4.2, CA-4.3
      *depende de:* T015

- [x] **T018** Testes de unicidade de nome de animal por dono
      *entrega:* `UT-014-1`, `UT-014-2`, `UT-014-3`, `UT-014-4`, `UT-014-5`, `UT-014-6` e
      `UT-014-7` passando, incluindo o segundo Rex do mesmo dono recusado, os Rex de donos
      diferentes aceitos, as duas formas de violação produzindo o mesmo erro, a edição que
      mantém o próprio nome aceita, as três grafias tratadas como o mesmo nome, e a consulta
      restrita aos animais daquele dono
      *satisfaz:* CA-2.1, CA-2.2, CA-2.3, CA-2.5
      *depende de:* T009

- [x] **T019** Teste de integração de cadastro concorrente do mesmo nome para o mesmo dono
      *entrega:* um teste de integração que dispara dois cadastros simultâneos do mesmo nome
      para o mesmo dono contra um banco de verdade e espera que exatamente um sobreviva e o
      outro receba a mensagem de nome já em uso, nunca falha genérica. **Não é verificável por
      teste de unidade**: a corrida real precisa de dois processos e de um banco. Compartilha a
      infraestrutura com T016 da feature 001.
      *entrega parcial, dito de propósito:* a metade de CA-2.4 que pede o **mesmo**
      comportamento em todos os bancos homologados só se verifica depois de a lista existir.
      Enquanto houver um único dialeto eleito pelo princípio P5, o teste roda sobre ele e a
      pendência fica registrada nas Perguntas em aberto da spec
      *satisfaz:* CA-2.3, CA-2.4
      *depende de:* T009

- [x] **T020** Situação do animal
      *entrega:* a coluna de situação (Ativo, Falecido, Transferido) por migração, com o nome
      declarado (P3) e Ativo como padrão; as transições de D09 com recusa das inválidas; a
      volta para Ativo restrita ao Administrador (verificada quando a 007 existir); o animal
      Falecido ou Transferido continuando na ficha e na verificação de nome duplicado. A
      recusa de agendamento novo é da 004 (CA-4.6)
      *satisfaz:* CA-3.5
      *depende de:* T015

## Sem tarefa

**Nenhum dos 21 critérios de aceite desta feature ficou sem tarefa.** Um deles, CA-2.4, é
entregue de forma declaradamente parcial por T019, e o motivo está escrito na própria tarefa:
o critério fala de "todos os bancos homologados" e essa lista não existe, porque o princípio
P5 da constituição manda eleger um único dialeto e a decisão ainda não foi tomada. A metade
estrutural do critério, que é o comportamento idêntico independente de a restrição ter nome
ou ser anônima, é entregue por T005 e por T009 e verificada por `UT-014-4`.
