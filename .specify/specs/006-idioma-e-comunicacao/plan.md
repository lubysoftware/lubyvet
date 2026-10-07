# Plano, Idioma e comunicação com o usuário

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

- **P-01** o idioma padrão é `pt-BR`; **P-02** os idiomas suportados são `pt-BR` e `en`.
- Os catálogos moram no front (`next-intl`, P-20), um arquivo por idioma. A API **nunca**
  devolve texto: devolve códigos de mensagem e de erro (D31), e o front os traduz. É isso que
  fecha a assimetria do legado, em que as mensagens de gravação ficavam fora do catálogo.
- O teste de completude cruza os catálogos com a lista de códigos declarada em
  `packages/contracts`: código sem tradução ou tradução sem código reprova (P7).
- O idioma persiste em cookie. A sessão de login (D19) fica no Redis, mas o idioma não
  depende dela.
- **P-03** data e número seguem o idioma; **P-04** o seletor aparece em todas as telas.
- O teste de completude do catálogo roda em `npm run verify` e falha com chave faltante ou
  chave sem consumidor (P7).

## Modelo de dados

**Esta feature não cria entidade de negócio nenhuma.** Nada aqui vai para o banco: o
vocabulário de tradução é arquivo de recurso, e o idioma escolhido vive no estado da sessão.
É a única feature do pacote em que isso é verdade, e o motivo de a seção existir assim mesmo é
que **há estrutura a declarar**, e no legado ela não estava declarada em lugar algum.

### O vocabulário de tradução

| item | no legado | no modelo novo |
|---|---|---|
| arquivos de catálogo | **11** | 11, mantendo o arquivo vazio de recurso por decisão da Pergunta 25 |
| idiomas efetivamente traduzidos | **10**: o padrão mais nove | os mesmos 10. Mudar a lista não está em card algum |
| chaves órfãs, traduzidas e sem consumidor | 3 | **zero**, e CA-4.2 é a verificação que impede novas |
| chaves usadas pelo código e ausentes de todo arquivo | 2 | **zero**. Este é o caso inverso, que CA-4.1 e CA-4.2 não nomeiam e a verificação precisa cobrir: elas caíam em texto fixo no idioma padrão |
| mensagens visíveis fora do catálogo | 6 de confirmação de gravação, mais 2 rótulos de formulário | **zero**, por CA-2.1 e CA-2.2 e pelo princípio P7 |
| lista de idiomas suportados, legível pela aplicação | **não existia em arquivo algum** | **passa a existir**, porque CA-3.1 precisa listá-la na tela e `UT-031-1` exige que o modelo comum das telas a carregue |

A última linha é o achado estrutural desta feature. O legado suportava 10 idiomas sem ter em
nenhum lugar uma lista dos 10: o conjunto era **o que havia na pasta de recursos**. Um
seletor de idioma não tem como existir assim, e é por isso que REQ-031 não é apenas uma
tela nova.

### O idioma na sessão

A máquina de estados EM-06 de `state-machines.md` descreve o que o legado fazia sem declarar:
sem escolha, o idioma é o padrão configurado; com um parâmetro de idioma suportado em qualquer
endereço, passa ao escolhido e **persiste**; com um parâmetro não suportado, volta ao padrão
sem erro. CA-1.1, CA-1.2 e CA-1.3 são exatamente as três transições, e a diferença do modelo
novo é que elas passam a ter nome e teste.

## Contratos

| operação | entrada | saída | erros |
|---|---|---|---|
| Resolver o idioma de uma requisição | o idioma pedido, quando houver, e o estado da sessão | o idioma efetivo da requisição | idioma não suportado **não é erro**: recai no padrão, sem erro e sem tela em branco (CA-1.2) |
| Trocar o idioma | o idioma escolhido, por parâmetro de endereço **ou** pelo controle de tela | o idioma efetivo, guardado para as requisições seguintes | os dois caminhos passam pelo **mesmo** ponto de resolução (CA-3.2) |
| Resolver um texto visível | a chave e o idioma efetivo | o texto traduzido | chave ausente no idioma é **falha de build**, não de runtime: é o que CA-2.3 e CA-4.2 exigem |
| Listar os idiomas suportados | — | a lista dos idiomas, com o em uso marcado | — |

**O parâmetro de troca de idioma é contrato público.** No legado ele funcionava em qualquer
endereço do sistema, e `UT-029-5` e `UT-031-2` exigem que continue assim. Trocar o nome desse
parâmetro é alterar contrato público, o que é item 2 do Não negociável da constituição.

**A chave de tradução é contrato interno, e vale tratá-la como contrato.** Os nomes das chaves
atravessam código, templates e 11 arquivos de recurso. O legado provou os dois modos de
quebrar: chave traduzida que ninguém usa, e chave usada que não está traduzida. A verificação
de CA-4.2 é o que torna as duas detectáveis no mesmo lugar.

**Falha de tradução é falha de build.** Esta é a decisão de contrato mais importante da
feature e merece estar escrita: se uma chave faltante só aparecer em runtime, o
comportamento observável é a tela mostrando a chave ou o texto no idioma padrão, que é
exatamente o defeito que esta feature existe para fechar.

## Migração de dados

**Nada a migrar, e não por o sistema ser demonstração.** Esta feature não tem dado de
negócio: não há tabela, não há linha, não há sequência. O que ela tem é **material a
aproveitar**, e vale separar as três categorias:

- **Os 10 idiomas traduzidos são ativo real.** São tradução feita, verificada por teste e
  inalcançável pela interface do legado. A feature inteira existe, em boa medida, para colher
  esse investimento. Reaproveitá-los é copiar arquivo, não traduzir de novo.
- **As 3 chaves órfãs não vêm.** É o card de descarte, US-4.
- **As 6 mensagens de gravação e os 2 rótulos em texto fixo vêm como chave nova**, traduzidas
  nos 10 idiomas. Esta é a única tradução **nova** que a feature exige, e é mensurável: oito
  textos curtos, dez idiomas.

Um detalhe sobre o arquivo vazio de recurso, para que ninguém o conserte por engano: ele tem
zero chave de propósito, existe para que o pedido daquele idioma resolva pelo catálogo padrão,
e a Pergunta 25 decidiu mantê-lo assim. Quem o encontrar vazio e o preencher muda o
comportamento de recurso e faz a verificação de completude passar a cobri-lo.

## Sequência

Ordem interna, pelas dependências declaradas nos cards:

1. **US-1 (REQ-029)** abre a feature e não depende de nada.
2. **US-2 (REQ-030)** depende de US-1. É o card de prioridade mais alta da feature, e o único
   obrigatório.
3. **US-3 (REQ-031)** depende de US-1 e pode andar em paralelo com US-2.
4. **US-4 (REQ-032)** não depende de card algum, e **convém vir antes de US-2**: a verificação
   que ela entrega é a mesma que CA-2.3 pede, e escrevê-la antes de acrescentar as oito chaves
   novas significa que as oito nascem verificadas.

**O que esta feature exige de outras:** nada. Como a feature 001, ela é base.

**O que outras features exigem dela:** praticamente todas. A feature 001 depende dela em
CA-1.2, CA-2.2 e CA-7.1; a 003 em CA-1.2 e CA-2.1; a 004 em CA-1.3, CA-2.3 e CA-3.2; a 005 na
marca de ausência de especialidade; a 008 na página de erro; a 010 nos rótulos de campo com
erro. Isso tem consequência prática de ordem: **US-1 e a verificação de US-4 são pré-requisito
de quase todo teste de mensagem do pacote**, e deixá-las para o fim obriga a reescrever
asserções em todas as outras features.

## Riscos

| risco | de onde vem | o que fazer |
|---|---|---|
| **O teste de completude cobrir só os templates.** É o defeito exato do legado: a regra existia, o teste existia, e o teste não olhava o lugar por onde a regra vazava | ADR-0006, e o vazamento das seis mensagens de gravação | CA-2.3 é o critério, e T004 entrega a verificação cobrindo **as duas origens de texto** antes de T006 acrescentar as chaves novas |
| **A chave usada e não traduzida.** O legado tinha duas, e elas não apareciam como erro: caíam em texto fixo no idioma padrão, de modo que só quem lesse o sistema em outro idioma perceberia | achado de `domain.md` §6 sobre o catálogo | T004 verifica os dois sentidos, chave sem consumidor e consumidor sem chave, no mesmo teste, e isso está dito na tarefa |
| **Preencher o arquivo vazio de recurso por engano.** Ele está vazio de propósito e a decisão humana é mantê-lo assim | Pergunta 25 | T003 declara a exceção **explicitamente** na verificação, com o motivo escrito ao lado, em vez de a exceção viver no comportamento de um teste |
| **Dois caminhos de troca de idioma.** O controle de tela e o parâmetro de endereço podem virar duas implementações, e a que ninguém usa é a que ninguém conserta | CA-3.2 e `UT-031-2` | T007 liga o controle ao **mesmo** ponto de resolução de T002, e o teste compara as duas sessões |
| **A lista de idiomas suportados não existir em arquivo.** No legado o conjunto era o que havia na pasta de recursos, e um seletor não tem como se montar a partir disso | achado estrutural desta feature, e `UT-031-1` | T005 cria a lista como configuração legível, antes de T007 montar o controle |
| **A escolha de idioma depender de sessão de servidor.** É o que o legado fazia, e a decisão de arquitetura pode tirar esse recurso do caminho | máquina EM-06, e a decisão de stack número 3 | T002 isola a persistência da escolha atrás de um único ponto, de modo que trocá-la por outro mecanismo não toque nas regras de CA-1.1 a CA-1.3 |
| **Localizar o que não é texto.** Data e número não vêm do catálogo, e há contradição conhecida entre o princípio P7 e REG-26 | pergunta em aberto desta spec e da feature 003 | nenhuma tarefa localiza formato de data. A contradição fica registrada nas duas specs até a decisão humana |
