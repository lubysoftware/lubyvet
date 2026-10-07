# Tarefas, Idioma e comunicação com o usuário

> Ordem de dependência. `[P]` marca tarefas que podem rodar em paralelo por tocarem
> arquivos diferentes.
>
> A coluna *satisfaz* aponta o critério de aceite do `spec.md`. Tarefa sem critério é
> infraestrutura, e está dito nela. Os identificadores `UT-nnn-n` são os testes que os
> cards do backlog já traziam, preservados como tarefa de teste própria.

- [ ] **T001** Trazer os 10 idiomas traduzidos do legado para o projeto novo, mantendo os 11
      arquivos de catálogo
      *entrega:* os 11 arquivos no projeto novo, com o arquivo de recurso vazio preservado
      vazio por decisão da Pergunta 25, e **sem** as 3 chaves órfãs do legado, que são o card
      de descarte de US-4
      *satisfaz:* — (infraestrutura, e é a tarefa que colhe o investimento de tradução já
      feito: copiar arquivo, não traduzir de novo)

- [ ] **T002** Implementar a resolução do idioma de uma requisição num único ponto
      *entrega:* a resolução que serve o idioma padrão quando não houve escolha, passa ao
      idioma escolhido quando ele é suportado, persiste a escolha para as requisições
      seguintes, e **recai no padrão sem erro** quando o idioma pedido não é suportado. A
      persistência da escolha fica isolada atrás desse mesmo ponto, para que trocar o mecanismo
      não toque nas regras
      *satisfaz:* CA-1.1, CA-1.2, CA-1.3
      *depende de:* T001

- [ ] **T003** [P] Declarar explicitamente, na verificação de catálogo, a exceção do arquivo
      de recurso vazio
      *entrega:* a exceção escrita em arquivo, com o motivo ao lado, em vez de viver no
      comportamento de um teste. No legado o teste de sincronia pulava o arquivo com o motivo
      num comentário, e essa é a forma de exceção que desaparece na primeira refatoração
      *satisfaz:* — (infraestrutura, pré-requisito de CA-2.3 e CA-4.2)
      *depende de:* T001

- [ ] **T004** Implementar a verificação de catálogo que falha nos **dois** sentidos
      *entrega:* uma verificação que falha quando uma chave usada falta em algum idioma
      suportado **e** quando uma chave existe em arquivo sem ser referenciada por código ou
      template, apontando a chave e o idioma. Ela cobre as duas origens de texto visível, o
      template e o código, e não apenas o template: é o defeito exato do legado, onde a regra e
      o teste existiam e o teste não olhava por onde a regra vazava
      *satisfaz:* CA-2.3, CA-4.1, CA-4.2
      *depende de:* T003

- [ ] **T005** [P] Declarar a lista de idiomas suportados como configuração legível pela
      aplicação
      *entrega:* a lista em arquivo, com o idioma padrão indicado, substituindo o arranjo do
      legado em que o conjunto de idiomas suportados era **o que havia na pasta de recursos** e
      não existia lista em lugar algum
      *satisfaz:* — (infraestrutura, pré-requisito de CA-3.1)
      *depende de:* T001

- [ ] **T006** Levar ao catálogo as 6 mensagens de gravação e os 2 rótulos de formulário que o
      legado escrevia em texto fixo
      *entrega:* as oito chaves novas traduzidas nos 10 idiomas, consumidas pelo código que
      produz a confirmação e o erro de gravação e pelos rótulos dos quatro formulários, de modo
      que nenhum texto visível nasça literal (princípio P7). Como T004 já está no lugar, as
      oito nascem verificadas
      *satisfaz:* CA-2.1, CA-2.2
      *depende de:* T004

- [ ] **T007** Implementar o controle de troca de idioma, ligado ao mesmo ponto de resolução
      *entrega:* um controle visível em todas as telas, listando os idiomas suportados, com o
      idioma em uso marcado, e que chama **o mesmo** ponto de resolução que o parâmetro de
      endereço chama, em vez de uma segunda implementação
      *satisfaz:* CA-3.1, CA-3.2, CA-3.3
      *depende de:* T002, T005

- [ ] **T008** Testes da resolução do idioma
      *entrega:* `UT-029-1` a `UT-029-5` passando, cobrindo as três requisições resolvidas no
      idioma escolhido sem repetir a escolha, o idioma fora da lista recaindo no padrão sem
      erro, a preferência declarada pelo cliente perdendo do padrão configurado por decisão
      explícita, a completude falhando com uma chave faltante, e a troca por parâmetro
      funcionando em três caminhos diferentes com a escolha guardada
      *satisfaz:* CA-1.1, CA-1.2, CA-1.3
      *depende de:* T002, T004

- [ ] **T009** Testes da tradução das mensagens de gravação e dos rótulos
      *entrega:* `UT-030-1` a `UT-030-4` passando, incluindo a confirmação e o erro de gravação
      resolvidos no idioma escolhido, os quatro formulários sem nenhum campo entregando texto
      igual nos dois idiomas por ser literal, a verificação acusando a chave retirada de um
      idioma e apontando qual, e o vocabulário completo em todos os idiomas sem chave sem uso
      *satisfaz:* CA-2.1, CA-2.2, CA-2.3
      *depende de:* T006

- [ ] **T010** Testes do controle de troca de idioma
      *entrega:* `UT-031-1` a `UT-031-4` passando, incluindo o modelo comum de qualquer tela
      carregando os idiomas suportados, as duas sessões terminando no mesmo idioma pelo mesmo
      caminho de resolução, o idioma em uso marcado entre os suportados, e a escolha feita pelo
      controle valendo na requisição seguinte
      *satisfaz:* CA-3.1, CA-3.2, CA-3.3
      *depende de:* T007

## Sem tarefa

**Nenhum dos 11 critérios de aceite desta feature ficou sem tarefa.** É a única feature do
pacote em que isso acontece, e o motivo é instrutivo: todos os critérios aqui são sobre
mecanismo verificável, nenhum depende de um valor de negócio que ninguém definiu. As três
perguntas em aberto da spec, o idioma padrão, o formato de data e o alcance da proteção contra
dupla submissão, **mudam o conteúdo** de tarefas que já existem, e nenhuma delas impede uma
tarefa de ser escrita: T002 resolve CA-1.2 e CA-1.3 contra qualquer idioma padrão configurado,
e é por isso que o valor em si pode chegar depois.
