# Plano, Interface e identidade visual

## Stack

**Decidida.** `.specify/arquitetura/decision.json`, confirmada em `memory/decisoes.md` D20:
Portas e adaptadores; TypeScript e NestJS como **única porta** para domínio e dados;
Next.js (React) com Tailwind e shadcn/ui como apresentação, na frente da API (D31, D35);
contrato em zod compartilhado gerando o OpenAPI (D32); PostgreSQL (CloudNativePG no cluster) como **único
dialeto** (P5); Prisma e Prisma Migrate com `@map` explícito em toda coluna (P3, D33); Redis;
RabbitMQ; guards do NestJS sobre identidade própria (D17); OpenTelemetry; Jest com
PostgreSQL real na API, Vitest e Playwright no front; Kubernetes agnóstico de provedor (D36). Monorepo
com `apps/api`, `apps/web` e `packages/contracts` (P-18). O build canônico é
`npm run verify` (P-23). As alternativas que a análise levantou e descartou estão em
`.specify/arquitetura/tech-stack.json` e não são reabertas aqui.

A regra de fronteira vale desde o primeiro arquivo: domínio e casos de uso não importam
NestJS, Prisma, Redis nem RabbitMQ. Eles entram só por porta, e o adaptador mora em
`infra/`. O `apps/web` não importa nada de `apps/api` além de `packages/contracts`. Um teste
de fronteira (regra de import) roda dentro de `npm run verify`.

Onde esta feature fala em "formulário", "página" ou "termina na ficha", lê-se pela D31: tela
no Next.js, validação com o mesmo schema zod da API, erro 422 com erros por campo exibidos no
próprio campo, e navegação para a ficha após sucesso.

**O que pesa nesta feature:**

- **D23** identidade LubyVet nova; Tailwind como compilador de estilo, com o CSS gerado
  pelo build e nunca versionado; fonte Figtree 400, 500, 600 e 700, com os arquivos no projeto.
- **D37** direção "Clínica calma": paleta e situações em tokens do Tailwind e do tema
  shadcn/ui, nos dois modos. **D38** modo escuro desde a v1, com troca manual. **D39**
  densidade confortável (44px). **D40** logo e nome por instalação, paleta fixa. **D41**
  Lucide e logotipo tipográfico provisório.
- **D42** o design system publicado é a referência de toda tela: tokens, os 19 componentes e o
  mapeamento para o shadcn/ui. Ler o README dele antes de criar qualquer componente.
- **D07** WCAG 2.2 AA: contraste verificado por teste automatizado (axe) em `npm run verify`.
- Next.js com shadcn/ui (D31, D35). O componente de campo do formulário recebe tudo por
  props tipadas, sem ler estado global (a armadilha do `minVisitDate` do legado vira erro de
  compilação).
- Os formulários são de dono, animal, agendamento, atendimento e os administrativos da 009:
  todos usam o mesmo componente de campo com marcação de erro e `aria-invalid` (US-3).
- O "estilo servido é produto do build" (CA-1.1) é o Tailwind compilado pelo build do Next;
  nenhum CSS gerado é versionado.

## Modelo de dados

**Esta feature não cria entidade nenhuma e não toca no banco.** O que ela tem, como a
feature 006, é estrutura a declarar, e no legado nada disso era declarado: a análise documentou
262 valores de estilo, dos quais 205 tinham prova em arquivo, 11 eram inferência e **46 não
tinham fonte alguma**, e o projeto **não tinha um único arquivo de valores de estilo**.

| artefato | no legado | no projeto novo |
|---|---|---|
| arquivo de valores de estilo declarados | **não existia.** As 23 variáveis do tema eram declaradas e não tinham efeito | passa a existir, e CA-1.2 é a verificação de que cada valor declarado **tem** efeito sobre o que é servido |
| folha de estilo publicada | **comitada**, 9.531 linhas, gerada por um perfil de build não ativado por padrão | produto do build, nunca comitada (CA-1.1) |
| paleta de pares de cor, com repouso, foco e passagem do ponteiro | não existia como conjunto. Os valores estavam espalhados e três pares reprovavam no contraste | passa a existir como conjunto nomeado, porque `UT-048-1` exige que **o par reprovado seja apontado pelo nome** |
| conjunto de pesos de fonte usados, e os pesos presentes nos arquivos | não existia. Três lugares pediam negrito e nenhum dos oito arquivos tinha esse peso | os dois conjuntos passam a ser confrontáveis, que é o que CA-2.2 pede |
| modelo de erro do formulário, com identificador de campo e texto | existia parcialmente nos fragmentos de template, apoiado em **catorze classes que a folha não definia** | passa a ser modelo explícito, verificável sem renderizar (`UT-049-1`, `UT-049-2`) |

**O que esta feature descarta, em número:** 9.919 linhas, das quais 9.531 são a folha compilada
comitada e o resto é o tema sem efeito. Vinte e dois seletores mortos, de procedência de outro
produto. Catorze classes órfãs em trinta e nove ocorrências. Um ícone inexistente na versão da
biblioteca usada. Uma animação referenciada e nunca definida. É a maior economia em linhas de
todo o backlog, e a de menor risco, porque o módulo é o de menor acoplamento do sistema.

**Duas observações que nenhum card cobre** e que ficam registradas para não voltarem como
suposição: dos 652 KB de arquivos de fonte do legado, 493 KB eram formatos obsoletos e **o
formato moderno não existia**; e os pontos de quebra de layout eram três, desalinhados, com um
deles se sobrepondo a outro por um pixel. Nenhum card pede nenhuma das duas, e por isso
nenhuma tarefa as trata.

## Contratos

Esta é a feature com menos contrato de todo o pacote, e o pouco que ela tem é **contrato de
verificação**, não de operação:

| verificação | entrada | resultado |
|---|---|---|
| Comparar pedido e entregue | os valores declarados no fonte e a folha produzida pelo build | falha, apontando a variável, quando um valor declarado não tem efeito sobre o que é servido (CA-1.2) |
| Procurar seletor sem uso | a folha publicada e os elementos da interface | falha, apontando o seletor, quando um seletor não tem elemento correspondente (CA-1.3) |
| Calcular contraste dos pares | a paleta nomeada, com repouso, foco e passagem do ponteiro, e o mínimo adotado | falha, **apontando o par pelo nome**, quando algum fica abaixo do mínimo (CA-2.1, CA-2.3) |
| Confrontar pesos de fonte | os pesos pedidos pelos estilos e os presentes nos arquivos de fonte | falha quando um peso pedido não existe em arquivo (CA-2.2) |

**A verificação precisa falhar para a cor nova, não só para a lista antiga.** `UT-048-3` é
específico sobre isso: a verificação falha apontando o par novo **em vez de passar por ele não
estar na lista anterior**. É a diferença entre uma verificação e um inventário, e é o que
impede a dívida de voltar pela porta de uma cor acrescentada depois.

**A marcação de erro é contrato do modelo entregue à tela, não do estilo.** CA-3.1 e CA-3.2 são
verificáveis sem renderizar nada: o modelo traz, para cada campo recusado, o identificador do
campo e o texto do erro, e os campos aceitos não vêm marcados. É o que torna as duas
testáveis apesar de a feature inteira falar de aparência. CA-3.3 é o oposto, e o critério já
diz: teste de interface.

## Migração de dados

**Nada a migrar, e esta é a única feature do pacote em que o material do legado é passivo, não
ativo.** Vale a comparação com a feature 006, onde as dez traduções são investimento feito a
colher: aqui as 9.919 linhas são o contrário.

- **A folha compilada não vem.** CA-1.1 a proíbe explicitamente.
- **O tema não vem.** As vinte e três variáveis dele têm efeito zero, provado por comparação com
  a folha compilada comitada, e portar um tema que não funciona é portar a aparência de uma
  decisão.
- **Os vinte e dois seletores mortos não vêm.** São de outro produto.
- **As catorze classes órfãs não vêm**, e o que precisa vir no lugar delas é US-3: a marcação de
  erro de verdade.
- **O que vem é a medição.** Os três valores de contraste que reprovam, os três lugares que
  pedem um peso de fonte inexistente, a lista das catorze classes e dos vinte e dois seletores:
  tudo isso está em `design-system/` e é o inventário do que **não** repetir. É o ativo real
  desta feature, e ele não é código.

## Sequência

Ordem interna: os três cards são **independentes**, nenhum declara dependência de card algum, e
os três podem andar em paralelo.

Ordem recomendada dentro do que os cards permitem:

1. **US-1 (REQ-047)** primeiro, porque as verificações dela são o que impede a dívida de nascer
   junto com a primeira folha de estilo do projeto novo. Escrever CA-1.2 depois de existirem
   duzentos valores de estilo é auditoria; escrever antes é uma verificação de build.
2. **US-2 (REQ-048)** em seguida, pelo mesmo motivo, e com a mesma ressalva: CA-2.1 depende de
   uma decisão humana e a parte automatizável não depende.
3. **US-3 (REQ-049)** em qualquer momento, e convém **antes** dos formulários das features 001,
   003 e 004 ficarem prontos, porque é mais barato marcar o erro na construção do fragmento que
   em quatro formulários já escritos.

**O que esta feature exige de outras:** a feature 006, pelo catálogo de tradução de que CA-3.2
depende, porque a marcação de erro vem com texto resolvido pelo catálogo.

**O que outras features exigem desta:** as features 001, 003 e 004 pela marcação de erro dos
formulários delas, e a 005 pela marca de ausência de especialidade, que é texto na tela. Nenhuma
declara a dependência por card, e isso é o mesmo padrão da feature 007: o que atravessa todas
não aparece nos `depends_on` de ninguém.

## Riscos

| risco | de onde vem | o que fazer |
|---|---|---|
| **A dívida renascer na primeira folha.** Comitar o estilo gerado é a decisão mais natural do mundo quando a geração é frágil, e foi exatamente o que o legado fez: a ferramenta está abandonada, o perfil que a executava não era ativado por padrão, e o resultado estava comitado | dívida DT-14, e a ferramenta de compilação abandonada | T001 põe a geração no build canônico **antes** de existir a primeira folha, e T002 é a verificação que impede o arquivo gerado de entrar no versionamento |
| **Declarar valores de estilo que não têm efeito.** É o achado central da análise, e ele não foi um erro bobo: foi a importação do framework feita antes das variáveis, mais catorze nomes extintos. Qualquer um dos dois sozinho produz o mesmo resultado silencioso | CA-1.2, e a comparação entre o fonte e a folha compilada | T003 compara o **pedido** com o **entregue**, não o pedido com ele mesmo. É a única verificação deste pacote que precisa executar o build para rodar, e isso está dito na tarefa |
| **Preservar a identidade visual e reprovar no contraste.** A cor de link que o tema pedia e nunca entregou reprova a 3,2 para 1 | medição de `design-system/color-palette.md`, e CA-2.1 | pergunta em aberto da spec. T005 verifica a paleta **adotada**, qualquer que seja ela, e aponta o par reprovado pelo nome. A decisão sobre a marca é de quem responde por ela |
| **A verificação de contraste virar inventário.** Uma verificação que só confere a lista antiga passa por qualquer cor nova | `UT-048-3` | T005 falha para o par novo abaixo do mínimo, e o teste existe exatamente para provar que a verificação não é uma lista |
| **Negrito sintetizado pelo navegador.** O legado pedia em três lugares um peso que nenhum dos oito arquivos de fonte tinha | CA-2.2 e `UT-048-2` | T006 confronta os dois conjuntos, pedidos e presentes, e falha por peso pedido sem arquivo. É o critério mais concreto desta feature e o mais barato de verificar |
| **Marcar o erro só por cor.** É o que a interface do legado tentava fazer, com classes que a folha não definia, e exclui quem não distingue aquelas cores | CA-3.2 e `UT-049-2` | T007 entrega a marcação com **texto** resolvido pelo catálogo de traduções, não apenas a indicação de estado do campo |
| **CA-3.3 não ser verificável por unidade.** O destaque existir nos quatro formulários é afirmação sobre a tela renderizada | o próprio critério, que diz "verificado por teste de interface" | T008 é teste de interface e isso está dito nela, como T015 da feature 001. Não é opcional: é o único critério desta feature que alcança o que o usuário vê |
| **Decidir tudo isto sem nunca ter visto a tela.** A aplicação não foi executada e não há screenshot: a extensão do dano das catorze classes órfãs é confiança vermelha | ressalva da própria spec, e as dúvidas D-DS-02, D-DS-07, D-DS-11 e D-DS-12, as quatro bloqueantes para reimplementação fiel | está em Perguntas em aberto, e é a pendência de maior alavancagem desta feature: uma execução e quatro capturas de tela, uma por formulário, fecham a dúvida. Nenhuma tarefa a substitui |
