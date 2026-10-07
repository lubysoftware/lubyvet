# Tarefas, Interface e identidade visual

> Ordem de dependência. `[P]` marca tarefas que podem rodar em paralelo por tocarem
> arquivos diferentes.
>
> A coluna *satisfaz* aponta o critério de aceite do `spec.md`. Tarefa sem critério é
> infraestrutura, e está dito nela. Os identificadores `UT-nnn-n` são os testes que os
> cards do backlog já traziam, preservados como tarefa de teste própria.
>
> Um dos nove critérios desta feature **não tem tarefa**, por faltar uma decisão humana. Ver a
> seção `Sem tarefa` no fim.

- [x] **T001** Pôr a geração do estilo no build canônico, antes de existir a primeira folha
      *entrega:* o estilo servido sendo produto do build, gerado por um compilador em
      manutenção, e **nenhum arquivo de estilo compilado no versionamento**. No legado a
      ferramenta de geração estava abandonada, o perfil que a executava não era ativado por
      padrão e o resultado estava comitado: os três fatos juntos são a dívida DT-14
      *satisfaz:* CA-1.1
      *depende de:* a decisão de stack sobre o compilador de estilo

- [x] **T002** [P] Impedir que arquivo de estilo gerado entre no versionamento
      *entrega:* a exclusão declarada no versionamento e uma verificação no build que falha se
      um arquivo de estilo gerado for comitado. A primeira sozinha é esquecível; a segunda é o
      que torna CA-1.1 durável
      *satisfaz:* CA-1.1
      *depende de:* T001

- [ ] **T003** Implementar a verificação que compara o **pedido** no fonte com o **entregue**
      pelo build
      *entrega:* uma verificação que falha, apontando a variável, quando um valor de estilo
      declarado não tem efeito sobre o que é servido. **Esta verificação executa o build para
      rodar**, e é a única do pacote com essa característica: comparar o fonte com ele mesmo não
      detectaria nada, e foi exatamente isso que deixou passar as vinte e três variáveis sem
      efeito do legado
      *satisfaz:* CA-1.2
      *depende de:* T001

- [ ] **T004** [P] Implementar a verificação de seletor sem elemento correspondente
      *entrega:* uma verificação que falha, apontando o seletor, quando ele não tem elemento
      correspondente na interface. No legado eram vinte e dois seletores mortos, de procedência
      de outro produto, correspondendo a cerca de cento e quarenta das duzentas e cinquenta e
      cinco linhas do bloco customizado
      *satisfaz:* CA-1.3
      *depende de:* T001

- [ ] **T005** Declarar a paleta de pares de cor nomeados e implementar a verificação de
      contraste
      *entrega:* a paleta como conjunto nomeado, com os pares de repouso, foco e passagem do
      ponteiro, e a verificação que calcula a razão de cada par, **aponta o par reprovado pelo
      nome** e falha o build. A verificação falha para um par **novo** abaixo do mínimo, em vez
      de passar por ele não estar na lista anterior: é a diferença entre uma verificação e um
      inventário.
      *entrega parcial, dita de propósito:* o **mínimo** é parâmetro desta verificação e não
      existe, porque o padrão de acessibilidade e o nível não foram definidos. A verificação
      nasce pronta e o número chega depois. Ver `Sem tarefa`
      *satisfaz:* CA-2.3
      *depende de:* T001

- [ ] **T006** [P] Implementar a verificação de peso de fonte presente em arquivo
      *entrega:* o confronto entre os pesos pedidos pelos estilos e os pesos presentes nos
      arquivos de fonte, falhando por peso pedido sem arquivo. É o critério mais concreto desta
      feature: o legado pedia negrito em três lugares e **nenhum dos oito arquivos de fonte
      tinha esse peso**, só o normal, de modo que o navegador o sintetizava
      *satisfaz:* CA-2.2
      *depende de:* T001

- [ ] **T007** Implementar o modelo de erro do formulário, com identificador de campo e texto
      *entrega:* para cada campo recusado pela validação, o identificador do campo e o texto do
      erro vindo do catálogo de traduções, com os campos aceitos **não** marcados, e a marcação
      acompanhada de texto, para que não dependa apenas de cor. É a substituição das catorze
      classes órfãs do legado por marcação de verdade
      *satisfaz:* CA-3.1, CA-3.2
      *depende de:* a feature 006 ter o catálogo de tradução em T001 de lá

- [ ] **T008** Teste de interface do destaque de erro nos quatro formulários
      *entrega:* um teste de interface que percorre os quatro formulários do sistema e verifica
      que o campo recusado fica destacado, com a mensagem junto dele e com o texto que a torna
      perceptível sem depender de cor. **É teste de interface, não de unidade**, e isso está no
      próprio critério: a existência do destaque na tela renderizada não é verificável pelo
      modelo
      *satisfaz:* CA-3.3
      *depende de:* T005, T007

- [ ] **T009** Testes das verificações de estilo e de acessibilidade
      *entrega:* `UT-048-1`, `UT-048-2`, `UT-048-3`, `UT-049-1` e `UT-049-2` passando, cobrindo
      todos os pares da paleta com repouso, foco e passagem do ponteiro, todo peso pedido
      existindo em arquivo, o par novo abaixo do mínimo reprovado pelo nome, os três campos
      recusados vindo com identificador e texto enquanto os aceitos não vêm marcados, e a
      marcação acompanhada de texto resolvido pelo catálogo
      *satisfaz:* CA-2.2, CA-2.3, CA-3.1, CA-3.2
      *depende de:* T006, T007

- [ ] **T010** Paleta LubyVet aprovada em WCAG 2.2 AA e verificação no build
      *entrega:* a paleta de D37 nos dois modos, em tokens do Tailwind e do tema shadcn/ui; a verificação de T005 com os
      limiares de D07 (4,5:1 e 3:1) para repouso, foco e passagem do ponteiro; e axe nos
      testes de interface dos formulários, dentro de `npm run verify`
      *satisfaz:* CA-2.1
      *depende de:* T005

- [x] **T011** Modo escuro e troca de tema
      *entrega:* o tema segue a preferência do sistema, com troca manual (claro, escuro,
      sistema) guardada em cookie e aplicada sem piscar na primeira renderização do Next;
      a verificação de contraste e o axe rodam nos dois modos (D38)
      *satisfaz:* CA-2.1
      *depende de:* T010

- [ ] **T012** Fundação visual: tipografia, densidade, ícones e marca da instalação
      *entrega:* Figtree 400–700 servida do projeto, com números tabulares em data, hora,
      peso e CPF (D37); controles e linhas de 44px (D39); Lucide com o mapa de ícones de
      espécie e o ícone genérico de pata (D41); o nome e o logo claro e escuro da clínica
      lidos da configuração da instalação, com o logotipo provisório como padrão (D40, D41);
      e os selos de situação com as cores de D37. Teste: todo ícone sem texto tem rótulo
      acessível
      *satisfaz:* CA-2.2
      *depende de:* T010

## Sem tarefa

Nenhum critério ficou sem tarefa. CA-2.1 ganhou padrão e nível em D07. A referência visual
do legado deixou de bloquear: a identidade é nova (D23), e o upstream está clonado em
`~/projects/spring-petclinic` para quem quiser conferir as telas.
