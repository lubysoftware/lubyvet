# Plano, Operação, erros e observabilidade

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

- **D03** só `liveness` e `readiness` ficam abertos, com estado agregado; o resto da gestão
  exige Administrador.
- **D36** tudo roda no cluster (CloudNativePG, Redis, RabbitMQ pelo operador), por Helm chart;
  o backup do Postgres tem ensaio de restauração automatizado (T023).
- **P-13** credenciais em `Secret`s consumidos por nome, preenchidos pelo mecanismo do cluster; nenhum valor no
  repositório.
- **P-16** OpenTelemetry exportando para o Grafana; log estruturado (pino) sem dado pessoal,
  retido por 30 dias; tempos das sondas declarados no manifesto.
- **D20** e **P-05** um só dialeto e um diretório de migrações Prisma; isso é CA-8.1.
- **P-17** `npm run verify` é o comando único, e a CI chama o mesmo comando.
- **D27** métricas de agenda, atendimento, base de clientes e WhatsApp, a partir de eventos de domínio,
  sem dado pessoal em rótulo.

## Modelo de dados

**Esta feature não cria entidade de negócio nenhuma**, e ao contrário da feature 006 ela também
não tem estrutura de arquivo de recurso a declarar. O que ela tem são **três artefatos de
configuração e um inventário**, e vale listá-los porque no legado nenhum dos quatro existia em
forma declarada:

| artefato | no legado | no projeto novo |
|---|---|---|
| inventário dos caminhos de gestão expostos, classificados em aberto e protegido | não existia: uma linha de configuração expunha **todos** | passa a existir, e `UT-040-2` e `UT-040-3` exigem que um caminho novo não classificado seja **protegido por padrão**. A existência do inventário não depende do conflito de US-4; a classificação depende |
| identificador de ocorrência de falha | não existia, porque não havia log | nasce com US-2, e é o que liga a página de erro ao registro (CA-2.1 e CA-2.3) |
| definição de esquema | **três**, em paralelo, mantidas à mão, sem ferramenta de migração | **uma**, por migração versionada (CA-8.1, CA-8.2), com o dialeto eleito por decisão humana |
| declaração das sondas no manifesto de publicação | existia, e **consumia** a superfície de gestão aberta | continua declarada, com os tempos de espera, e o manifesto passa a declarar também o que a dívida DT-19 registra como ausente: limites de recurso, sonda de inicialização e transporte seguro. Nenhum card pede os três últimos, e por isso eles são observação, não tarefa |

**O que esta feature apaga do modelo de dados das outras.** CA-8.1 e CA-8.3 são a razão pela
qual as features 002, 003 e 005 podem escrever "o limite existe nos dois lados com o mesmo
número" sem ambiguidade. Enquanto houvesse três dialetos, a frase não teria referente: cada uma
das três correções de contradição daquelas features pressupõe esta história.

## Contratos

| operação | entrada | saída | erros |
|---|---|---|---|
| Resolver identificador inexistente | o identificador pedido | **"não encontrado"**, com página amigável, sem rastro de pilha, nome de classe nem texto de consulta | é o próprio contrato de erro, e ele muda em relação ao legado, que devolvia falha genérica (REG-48). A resolução acontece **uma vez** por requisição (CA-1.3) |
| Tratar falha inesperada | a falha | página de erro com mensagem compreensível e **identificador da ocorrência**, mais o registro em log com o mesmo identificador | erro de domínio e erro técnico chegam à **mesma** resposta, cada um com identificador distinto (`UT-038-5`) |
| Consultar vivacidade | — | positivo ou negativo | não exige identificação, e não revela nada além do estado agregado (CA-3.3) |
| Consultar prontidão | — | positivo só quando as dependências necessárias, inclusive o banco, estão acessíveis | idem. Um verificador que falhe com mensagem detalhada **não** faz a resposta carregar nome de dependência, endereço, credencial ou causa |
| Consultar caminho de gestão | o caminho e a identidade, quando houver | depende da arbitragem do conflito de US-4 | — |

**A mudança de contrato público desta feature é "não encontrado".** No legado o resultado era
falha genérica, e trocá-lo é alteração de contrato público, item 2 do Não negociável da
constituição. Está autorizada aqui porque é exatamente o que o card REQ-037 pede, com quatro
critérios, e porque as features 003 e 004 dependem dela: CA-5.1 e CA-5.2 de lá fixam o mesmo
resultado para o par dono e animal incompatível.

**O que é proibido no contrato, e verificado por teste:** rastro de pilha, nome de classe,
texto de consulta ao banco, versão de biblioteca e caminho de arquivo, em **qualquer** resposta
de erro (CA-1.2, CA-2.2); nome de dependência, endereço, credencial ou causa nas sondas
(CA-3.3); valor de credencial em resposta, em log ou em saída de console (CA-4.4); dado pessoal
e credencial no log (CA-5.3); console de banco de dados em qualquer caminho e em qualquer
perfil (CA-7.1); e qualquer caminho que provoque falha deliberada (CA-6.1).

**A máscara de credencial preserva a chave e esconde o valor.** `UT-040-4` pede exatamente
isso, e a distinção importa: esconder a chave também torna o diagnóstico impossível, e esconder
só o valor é o que a lacuna G12 cobrava, porque o utilitário de teste do legado imprimia a
senha inteira.

## Migração de dados

A resposta da Pergunta 13 vale aqui também: **o sistema nunca operou de verdade, é
demonstração.** E nesta feature isso tem uma consequência que vale nomear.

- **Não há log histórico a migrar, e não há como saber o que era usado.** É a lacuna central
  desta feature, não um detalhe: a priorização de todo o pacote foi derivada de estrutura, e
  não de uso, porque as duas outras fontes previstas, frequência de chamada e caminho preferido
  do usuário, não existem. A resposta da Pergunta 11 afirma que há log de produção ou APM
  acessível, **e nenhuma etapa o consultou**. Se existir, ele vale mais que qualquer outra coisa
  nesta seção.
- **Os três conjuntos de definição de esquema não migram, convergem.** CA-8.1 é a decisão de
  descartar dois e eleger um, e como não há dado nos três, a convergência não tem conversão.
  Numa migração real este seria o item mais caro da feature; aqui é o mais barato, e é por isso
  que **esta é a hora de fazê-lo**.
- **A carga inicial muda de papel.** No legado ela recriava o esquema a cada inicialização e,
  no perfil padrão, começava apagando as sete tabelas. Com migração versionada, a definição do
  esquema sai da carga, e o que sobra é massa de teste.
- **Nenhum valor de credencial do legado é reproduzido neste pacote**, e nenhum deve ser
  recriado em arquivo do projeto novo: item 8 do Não negociável. O inventário dos cinco locais
  está nas lacunas G8, G9 e G12 de `integrations/integrations.md`, e esta spec não reproduz um
  único valor.

## Sequência

Ordem interna, pelas dependências declaradas nos cards:

1. **US-1 (REQ-037)**, **US-2 (REQ-038)**, **US-3 (REQ-039)**, **US-5 (REQ-041)**, **US-6
   (REQ-042)**, **US-7 (REQ-043)** e **US-8 (REQ-044)** não declaram dependência de card algum.
   Sete das oito histórias são independentes, o que é o oposto da feature 004.
2. **US-4 (REQ-040)** depende de US-3.

Ordem recomendada dentro do que os cards permitem, e o motivo de ela não ser a ordem dos
números: **US-5 antes de US-2**, porque CA-2.3 exige que a falha fique registrada no log e o
log é de US-5; **US-8 antes de tudo**, porque CA-8.1 e CA-8.2 são pré-requisito das três
correções de contradição das features 002, 003 e 005; e **US-6 e US-7 em qualquer momento**,
porque são descartes e o custo delas é não fazer.

**Lacuna do backlog, registrada e não corrigida:** US-4 declara dependência de US-3, e o que
ela realmente precisa é de **identidade**, que é a feature 007. A dependência declarada não
está errada, as sondas precisam existir antes de serem a exceção, mas está incompleta. O card
foi mantido como está, porque quem o escreveu olhou o sistema; a lacuna fica aqui para quem
planejar a ordem entre features.

**O que esta feature exige de outras:** a feature 006, pelo catálogo de tradução das mensagens
de erro, e a página de erro do legado não tinha tradução verificada; a feature 007, por
identidade, para US-4, se e quando o conflito for arbitrado.

**O que outras features exigem desta:** as features 003 e 004 pelo "não encontrado" de US-1; as
features 002, 003 e 005 por CA-8.1 e CA-8.2, que é a base das três correções de contradição; e
todas as outras pela página de erro, que é o destino de qualquer falha.

## Riscos

| risco | de onde vem | o que fazer |
|---|---|---|
| **Três critérios de US-4 pararem pelo conflito.** É a lacuna mais grave do sistema e, ao mesmo tempo, uma decisão humana explícita no sentido oposto | Pergunta 10 contra CA-4.1, CA-4.2 e CA-4.3, item 6 do Não negociável | não arbitrar. Os três vão para `Sem tarefa`. T010 entrega o **inventário classificado**, que é útil nos dois cenários e não decide nada, e T011 entrega CA-4.4, que não está em conflito |
| **Fechar a superfície e quebrar a publicação.** Os manifestos consomem a mesma superfície para as sondas de saúde | nota operacional da própria Pergunta 10 | CA-4.2 é o critério que trata disso, e está em `Sem tarefa` junto dos outros. Quem arbitrar precisa ler a nota: a resposta "fechar tudo" sem exceção não é implementável |
| **Esquecer de classificar um caminho de gestão novo.** O caminho nasce exposto, que é o estado do legado | `UT-040-2` e `UT-040-3` | T010 faz a ausência de classificação significar **protegido**, e esse é o lado seguro do erro. A tarefa existe mesmo com o conflito aberto, porque classificar não é abrir nem fechar |
| **O log vazar dado pessoal.** Um log útil para diagnóstico tende a registrar o que o usuário enviou, e é justamente nome, endereço e telefone | CA-5.3 e `UT-041-3` | T006 registra o dono por **identificador**, nunca por nome, e o teste procura os valores. É mais barato acertar na primeira linha de log que auditar depois |
| **O identificador de ocorrência não bater entre a tela e o log.** São dois caminhos de saída e um valor | CA-2.1 e CA-2.3 | T005 gera o identificador **uma vez** e o passa aos dois destinos, com gerador injetável, e `UT-038-3` compara os dois |
| **A busca dupla do identificador inexistente.** No legado o mesmo identificador era carregado duas vezes, uma na resolução do vínculo e outra no tratamento | CA-1.3 e `UT-037-3` | T003 resolve uma vez e propaga o resultado, e o teste **conta** as buscas recebidas pelo repositório |
| **O inventário de caminhos envelhecer.** CA-1.4 e CA-4.3 pedem teste para **cada** caminho | `UT-037-4` e `UT-040-1` | T004 e T010 escrevem o teste a partir da **lista**, não caminho por caminho. É a mesma técnica de `UT-017-3` na feature 003 e de T007 na feature 007 |
| **Cobertura continuar não reportável.** É a dívida DT-20, e esta feature é a que mais depende de medição | DT-01 e DT-20 | é decisão de stack número 5 e princípio P8. Nenhuma tarefa daqui a resolve, e vale dizer: um pacote que pede teste em 27 critérios e não mede cobertura está pedindo fé |
