# Busca e navegação de donos

**Origem:** épico EP-2 do backlog do sistema legado (objetivo do épico: encontrar um dono já cadastrado sem percorrer a base inteira)
**Cards:** REQ-008, REQ-009, REQ-010, REQ-011, REQ-012

## Por que esta feature existe

Quem atende no balcão chega com um nome, não com um identificador. A busca é o caminho de
entrada mais usado do sistema: sem ela, achar um cliente exige percorrer a listagem
completa, que no legado era exatamente o que acontecia quando o campo vinha vazio, porque o
próprio código chamava a busca sem termo de "a busca mais ampla possível".

O legado acertou o recorte e errou a navegação. A busca por começo de sobrenome, o salto
direto para a ficha quando havia um só resultado e o desvio de página fora de faixa estavam
implementados e eram comportamento deliberado, inclusive o desvio de faixa, que é o conteúdo
do único commit existente no repositório. Mas a preservação do filtro que o desvio fazia era
desfeita pelos próprios links de paginação da listagem, que montavam o endereço da página
seguinte sem o sobrenome procurado: clicar em "página 2" de uma busca por um sobrenome
passava a listar a base inteira. E o resultado da busca mudava conforme o banco escolhido,
porque a insensibilidade à caixa vinha da configuração da coluna em dois dos três dialetos e
não existia no terceiro.

## Histórias de usuário

### US-1 (REQ-008) Buscar donos pelo começo do sobrenome

Como usuário do sistema, quero localizar um dono digitando o começo do sobrenome para chegar
à ficha dele sem percorrer a base inteira.

**Critérios de aceite**

- [ ] CA-1.1 Informado o começo de um sobrenome, a lista traz apenas os donos cujo sobrenome começa por esse termo, com nome, endereço, cidade, telefone e os nomes dos animais de cada um
- [ ] CA-1.2 Campo vazio, ou preenchido só com espaços, devolve todos os donos
- [ ] CA-1.3 Espaços nas pontas do termo são desconsiderados: o termo cercado de espaços e o termo sem eles produzem o mesmo resultado
- [ ] CA-1.4 Busca sem nenhum resultado devolve o próprio formulário com erro no campo de sobrenome, nunca uma lista vazia
- [ ] CA-1.5 A busca não altera nada na base

**Regras de negócio que valem aqui**

- REG-07 a busca é por começo de sobrenome, nunca por nome, cidade ou telefone (`domain.md` §2.2)
- REG-08 campo vazio devolve todos os donos (`domain.md` §2.2)
- REG-09 espaços nas pontas do termo são removidos antes da consulta (`domain.md` §2.2)
- REG-11 zero resultados devolve o formulário com erro de campo, não uma lista vazia (`domain.md` §2.2)

> CA-1.2 preserva deliberadamente um comportamento que é também uma exposição: a listagem
> completa da base de clientes, com endereço e telefone, alcançável sem nenhum filtro. A
> resposta da Pergunta 9 decidiu **manter** essa listagem acessível a qualquer requisitante,
> e a resposta da Pergunta 8 decidiu papéis distintos de leitura e escrita. As duas
> convivem mal, e isso está registrado em Perguntas em aberto.

### US-2 (REQ-009) Paginar a listagem de donos preservando o filtro da busca

Como usuário do sistema, quero navegar entre as páginas de um resultado de busca sem perder
o que procurei para não ter de refazer a busca a cada página.

**Critérios de aceite**

- [ ] CA-2.1 Buscar por um sobrenome com mais de uma página de resultado e ir para a página seguinte continua listando apenas os donos daquele sobrenome
- [ ] CA-2.2 Pedir uma página menor que um ou maior que o total leva à primeira página do mesmo resultado, com o filtro mantido
- [ ] CA-2.3 Com a base vazia, pedir qualquer página responde a primeira página vazia e não entra em laço de redirecionamento
- [ ] CA-2.4 O tamanho da página é um parâmetro de configuração, não um valor fixo em código

**Regras de negócio que valem aqui**

- REG-12 no legado, cinco donos por página, valor fixo em uma variável local (`domain.md` §2.2)
- REG-13 página fora de faixa desvia para a primeira página preservando o filtro de sobrenome (`domain.md` §2.2)

> CA-2.1 corrige um defeito confirmado do legado: a preservação do filtro existia no
> controlador e era desfeita pelos links da listagem, que montavam o endereço da página sem
> o sobrenome. É o `BUG-UI-01` do inventário de interface, e a regra do controlador e a do
> template discordavam entre si.
>
> CA-2.3 tem uma razão precisa: no legado o desvio de faixa só terminava porque o total de
> páginas era forçado ao mínimo de um. Remover esse piso numa simplificação cria laço
> infinito de redirecionamento com a base vazia.

### US-3 (REQ-010) Ir direto à ficha quando a busca encontra um único dono

Como usuário do sistema, quero ser levado direto à ficha quando minha busca encontra uma só
pessoa para poupar um clique no caminho mais comum do balcão.

**Critérios de aceite**

- [ ] CA-3.1 Busca que devolve exatamente um dono apresenta a ficha desse dono, sem passar pela lista
- [ ] CA-3.2 Busca que devolve dois ou mais donos apresenta a lista normalmente
- [ ] CA-3.3 A ficha alcançada por esse atalho não exibe mensagem de confirmação de gravação

**Regras de negócio que valem aqui**

- REG-10 um único resultado pula a lista e vai direto à ficha do dono (`domain.md` §2.2)

### US-4 (REQ-011) Buscar ignorando maiúsculas e minúsculas em qualquer banco

Como usuário do sistema, quero que a busca encontre o dono independentemente de como eu
digito o sobrenome para não depender de saber a grafia exata do cadastro.

**Critérios de aceite**

- [ ] CA-4.1 Buscar o mesmo sobrenome em minúsculas, capitalizado e em maiúsculas devolve exatamente o mesmo conjunto de donos
- [ ] CA-4.2 O comportamento é o mesmo em todos os bancos homologados para o sistema novo, verificado por teste que roda contra o banco escolhido

**Regras de negócio que valem aqui**

- REG-14 no legado a busca ignorava a caixa apenas em dois dos três dialetos, por configuração de coluna, e no terceiro era sensível à caixa (`domain.md` §2.2)

> A diferença não era anunciada em lugar nenhum: o mesmo termo produzia dois resultados
> diferentes conforme o perfil de banco ativo. Este card existe para que a reescrita escolha
> um lado em vez de herdar a divergência, e a escolha precisa estar na normalização feita
> pela aplicação, não na configuração da coluna, para não voltar a depender do dialeto.

### US-5 (REQ-012) Cumprir tempo de resposta definido na listagem de donos

Como usuário do sistema, quero que a listagem de donos responda dentro de um tempo
previsível para que o atendimento no balcão não espere pelo sistema.

**Critérios de aceite**

- [ ] CA-5.1 A listagem paginada responde em menos de 500 ms, medido no percentil 95, com 50 mil donos na base *(D08)*
- [ ] CA-5.2 A medição é automatizada e roda contra uma base com volume representativo, não contra os dez donos da carga de exemplo

**Regras de negócio que valem aqui**

- REG-12 o recorte de página limita a consulta, em vez de ler a base inteira e cortar depois (`domain.md` §2.2)

> **Esta história não tem número, e o número é o critério.** O limite de tempo e o volume de
> referência não existem em nenhuma fonte da análise: a volumetria produtiva é inacessível e
> o sistema não tinha log nem métrica de aplicação, de modo que nem o tempo esperado nem o
> volume esperado podem ser derivados. Os dois valores estão em Perguntas em aberto. O que
> sobra de verificável é a forma da consulta, e isso tem tarefa.

## Fora de escopo

- **Buscar por nome, cidade, telefone ou qualquer campo que não o sobrenome.** Nenhum card pede. O legado buscava só por começo de sobrenome e isso é o comportamento a preservar, inclusive na recusa: um termo que casa com o nome mas não com o começo do sobrenome não encontra o dono.
- **Ordenar a listagem por outra coluna, ou deixar o usuário escolher a ordem.** Nenhum card pede. O legado não oferecia escolha de ordenação na listagem de donos.
- **Busca por aproximação ou tolerante a erro de digitação.** A detecção de dono parecido é da feature 001, serve a outro propósito (evitar cadastro duplicado) e tem o próprio critério.
- **Quem pode listar a base de clientes.** É da feature 007. Nesta feature o ator é "usuário do sistema", pelo mesmo motivo da feature 001.
- **A ficha do dono em si.** O conteúdo e a paginação do histórico de visitas são da feature 001; esta feature só a alcança.

## Perguntas em aberto

- [x] **Qual é o limite de tempo de resposta da listagem, e com qual volume de base?** Bloqueia CA-5.1 e CA-5.2 por inteiro. Não há de onde derivar: a volumetria de produção é inacessível e não existe métrica nem log de aplicação no legado (dúvida D-DET-06 de `domain.md` §6). O card REQ-012 foi movido para pronto por uma pessoa com esta pergunta ainda aberta. → ✅ **D08**: p95 < 500 ms com 50 mil donos
- [x] **Quais bancos serão homologados para o sistema novo?** Bloqueia CA-4.2, que fala de "todos os bancos homologados". A resposta da Pergunta 13 esclareceu que o legado nunca operou de verdade, logo não existe perfil de produção a imitar, e o princípio P5 da constituição exige eleger um dialeto. Enquanto a eleição não acontecer, CA-4.2 não tem alvo. → ✅ **P-05**: só PostgreSQL
- [x] **A listagem completa da base, sem filtro, continua acessível a qualquer requisitante, ou passa a depender de papel?** A resposta da Pergunta 9 diz manter acessível a qualquer requisitante; a da Pergunta 8 diz papéis distintos de leitura e escrita. As duas respostas são humanas e discordam sobre o mesmo endereço. O pacote não arbitra entre elas, pela regra do item 1 do Não negociável da constituição. → ✅ **D04**: exige login
- [x] **O tamanho de página configurável tem valor padrão e faixa permitida?** CA-2.4 exige que o tamanho venha de configuração, e o legado tinha cinco fixo em uma variável local. Nenhum card diz qual é o padrão nem se existe limite máximo, e um tamanho de página sem teto é um caminho para derrubar a listagem a pedido. → ✅ **P-06**: 10 por padrão, de 5 a 50

## Rastreabilidade

| item | vem de |
|---|---|
| US-1 | REQ-008 · UC-01 · REG-07, REG-08, REG-09, REG-11 · `OwnerController.java:94`, `OwnerRepository.java:45`, `findOwners.html:9` |
| US-2 | REQ-009 · UC-01 · REG-12, REG-13 · `OwnerController.java:108,142`, `ownersList.html:35` · BUG-UI-01 |
| US-3 | REQ-010 · UC-01, UC-04 · REG-10 · `OwnerController.java:122` |
| US-4 | REQ-011 · UC-01 · REG-14 · `db/h2/schema.sql`, `db/postgres/schema.sql` · D-DET-08 |
| US-5 | REQ-012 · UC-01 · REG-12 · `OwnerController.java:141` · D-DET-06 |
