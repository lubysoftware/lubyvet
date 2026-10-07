# Plano, Gestão de donos

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

- **D05** celular brasileiro, normalizado em E.164; exemplos de teste definidos.
- **D13** CPF e celular obrigatórios, e-mail opcional, consentimento de mensagens.
- **D14** aviso de dono parecido pelo celular; **D15** CPF único e bloqueante, por índice
  único parcial; o erro de unicidade é reconhecido pelo tipo (`P2002` do Prisma), nunca
  pelo texto.
- **D16** token de idempotência por formulário (mecanismo genérico, compartilhado com 003,
  004 e 009).
- **D02** `criado_por` e `alterado_por` no dono; a coluna nasce aqui e a 007 a preenche.
- A concorrência otimista (US-5) é escrita à mão sobre Prisma: `update ... where id and
  versao`, e zero linhas afetadas significa versão vencida.

## Modelo de dados

Entidade raiz desta feature: **Dono**. No legado era a tabela `owners`, sem nenhuma chave
estrangeira, raiz do agregado que inclui animais e visitas.

| campo | tipo no legado | obrigatório | muda no modelo novo |
|---|---|---|---|
| `id` | inteiro gerado pelo banco | sim | **não muda.** Decisão da Pergunta 20, e princípio P4 |
| `first_name` | texto, 30 | sim | nome de coluna passa a ser declarado explicitamente (P3) |
| `last_name` | texto, 30, indexado | sim | idem. É a base da busca da feature 002 |
| `address` | texto, 255 | sim | idem |
| `city` | texto, 80 | sim | idem |
| `telephone` | texto, 20 no banco, exatamente 10 dígitos na aplicação | sim | **a regra de formato muda** (D05): celular brasileiro gravado em E.164, `varchar(14)` nos dois lados. O desencontro entre os 20 caracteres do banco e os 10 dígitos da validação é do legado e não deve ser reproduzido |
| `version` | não existia | sim | **campo novo**, exigido por CA-5.1. No legado nenhuma entidade tinha marca de versão, e por isso a última gravação vencia em silêncio (REG-43) |
| `cpf` | não existia | sim, até anonimizar | **campo novo** (D13, D15): 11 dígitos, índice único parcial `WHERE cpf IS NOT NULL` |
| `email` | não existia | não | **campo novo** (D13): até 254 caracteres |
| `consentimento_mensagens_em` | não existia | não | **campo novo** (D12): data do consentimento; nulo significa sem consentimento |
| `created_by`, `updated_by` | não existiam | sim | **campos novos** (D02): referência ao usuário; preenchidos pela 007 |
| `created_at`, `updated_at` | não existiam | sim | **campos novos**, decisão da Pergunta 12: colunas de criação e de alteração. A autoria fica nas colunas da linha anterior (D02). Sem data de criação não se sabe o que estaria vencido numa política de retenção |
| `anonymized_at` ou equivalente | não existia | não | **campo novo** exigido pelo princípio P2 e pelo card REQ-035, que está na feature 007. O desenho do campo pertence a ela; aqui fica registrado que o Dono é a entidade que ele atinge |
| `email`, `document` | não existiam | indefinido | **decididos na Pergunta 15 e sem critério de aceite em nenhum card.** Entram no modelo como pendência declarada, não como coluna a criar agora. Ver Perguntas em aberto da spec |

Relações que o Dono carrega e que são detalhadas em outras features: um dono tem muitos
animais (feature 003) e, por eles, muitas visitas (feature 004). No legado o agregado era
gravado inteiro, em cascata e sem remoção de órfãos, e era essa gravação em bloco que fazia
CA-4.4 ser verdade sem nenhum código próprio. No modelo novo CA-4.4 precisa de teste
próprio, porque a fronteira transacional pode deixar de ser a mesma.

**O que não muda e precisa de atenção:** a identidade de objeto no legado era por
referência, não por valor, e a Pergunta 21 decidiu mantê-la assim. Essa ausência sustentava
dois comportamentos: a coleção de visitas absorvia a visita que o controller anexava duas
vezes, e a coleção de especialidades do veterinário escondia a duplicata da junção. O
segundo caso é da feature 005.

## Contratos

Operações desta feature, descritas por comportamento. O protocolo depende da stack, que
está em aberto, e por isso nenhuma rota é fixada aqui. O que está fixado é o conjunto de
entradas, saídas e erros, porque isso é contrato pelo princípio P9.

| operação | entrada | saída | erros |
|---|---|---|---|
| Criar dono | nome, sobrenome, endereço, cidade, telefone | identificador do dono criado e a ficha dele | campo obrigatório ausente; campo acima do limite; telefone fora do formato. Em todos, nada é gravado e o que foi digitado volta |
| Avisar sobre dono parecido | os mesmos campos da criação | lista de candidatos, mais a indicação de que a confirmação ainda não aconteceu | nenhum. O aviso não bloqueia (CA-3.3) |
| Confirmar criação apesar do aviso | os mesmos campos, mais a confirmação explícita | identificador do dono criado, e registro de que o aviso foi dispensado | os mesmos da criação |
| Abrir edição de dono | identificador do dono | os cinco campos atuais, mais a marca de versão | dono inexistente, tratado pela feature 008 |
| Alterar dono | identificador do dono, marca de versão, e os campos a alterar | ficha do dono atualizada | versão vencida, com os dados atuais ao lado dos digitados (CA-5.1 e CA-5.2); identificador do corpo diferente do identificador pedido (REG-05); os mesmos erros de validação da criação |
| Ler ficha do dono | identificador do dono, e a página do histórico de visitas | contato, animais em ordem alfabética, visitas de cada animal em ordem crescente de data, e os atalhos de CA-6.3 | dono inexistente, tratado pela feature 008. A operação não grava nada (CA-6.5) |

**Semântica de alteração parcial.** A Pergunta 22 decidiu objeto próprio de entrada com
semântica declarada de alteração parcial. Isso precisa estar escrito no contrato: campo
ausente significa "não alterar", campo presente e vazio significa "limpar", e nesse caso a
validação de obrigatoriedade reprova. No legado o comportamento era consequência acidental
do mecanismo de ligação de dados, e existia um teste que provava que uma gravação sem
nenhum campo era válida e idempotente.

**Mensagem de resultado.** CA-7.1 e CA-7.2 fixam que a confirmação e o erro viajam na mesma
resposta da operação. Isso é mudança em relação ao legado, onde a mensagem de erro
dependia de um mecanismo de sobrevivência a redirecionamento e aparecia uma requisição
depois (contradição C5).

## Migração de dados

A resposta da Pergunta 13 muda a natureza desta seção: **o sistema nunca operou de verdade,
é demonstração.** Não existe base de produção de donos a migrar. Os dados que existem são
10 donos de exemplo nos arquivos de carga inicial do legado.

Consequências práticas:

- **Nasce vazio.** A tabela de donos do sistema novo começa sem registro, e os 10 donos de
  exemplo são úteis apenas como massa de teste.
- **Nada de converter telefone.** Como não há dado real, a decisão de formato de telefone
  (US-2) não arrasta conversão de base: ela só precisa estar tomada antes do primeiro
  cadastro.
- **As colunas novas nascem preenchidas.** `version`, `created_at` e `updated_at` não têm
  valor legado a herdar, então não existe o problema de registro antigo sem data.
- **O que precisa vir do legado é a regra, não a linha.** Os limites de tamanho, a ordem
  alfabética dos animais e a ordem crescente das visitas são comportamento a preservar e
  estão nos critérios de aceite.

## Sequência

Ordem interna, pelas dependências declaradas nos cards:

1. **US-1 (REQ-001)** não depende de nada e abre a feature.
2. **US-6 (REQ-006)** também não depende de nada e pode andar em paralelo com US-1, mas é
   pré-requisito de US-7 e é o destino de toda escrita (REG-47), então convém existir antes
   de US-1 fechar.
3. **US-4 (REQ-004)** depende de US-1.
4. **US-3 (REQ-003)** depende de US-1.
5. **US-5 (REQ-005)** depende de US-4.
6. **US-7 (REQ-007)** depende de US-6.
7. **US-2 (REQ-002)** não declara dependência de card, mas depende de uma decisão humana.

O que esta feature exige de outras: nada. Ela é a base.

O que outras features exigem dela: a feature 002 (busca) depende de US-6 pelo salto para a
ficha quando a busca encontra um só dono; a feature 003 (animais) depende de US-6; a
feature 004 (visitas) depende da feature 003; a feature 008 trata o erro de dono
inexistente que aparece em US-4 e US-6.

## Riscos

| risco | de onde vem | o que fazer |
|---|---|---|
| **Nome de coluna renomeado em silêncio.** No legado 18 das 24 colunas tinham o nome derivado de uma linha de configuração, e nenhum teste comparava o nome gerado com o do esquema | o maior risco de migração medido pela análise, decidido na Pergunta 14 | T001 e T002 deste plano: declarar nome de coluna e escrever o teste que compara declaração com migração, antes de gravar o primeiro registro |
| **CA-5.1 não é verificável por teste de unidade.** A corrida real entre dois processos sobre o mesmo banco exige teste de integração | achado de QA do card REQ-005, idêntico ao de REQ-014 na feature 003 | tarefa de integração própria, T016, compartilhada com a feature 003 |
| **CA-7.3 só se prova executando a página.** A metade do critério que fala em erro na tela não é testável por unidade | achado de QA do card REQ-007, e a lacuna LAC-UC-07 descreve o script da ficha falhando justamente quando não há mensagem a esconder | T015 é teste de interface, não de unidade, e isso está dito na tarefa |
| **Dono duplicado silencioso.** O legado aceitava duplicata sem aviso, e a lacuna é a mais barata de corrigir e a que mais degrada a base com o tempo | REG-04 e Pergunta 18 | US-3 existe por isso, e está bloqueada por uma pergunta em aberto. Enquanto ela não for respondida, a feature entrega CA-3.2 e CA-3.3 e deixa CA-3.1 sem tarefa |
| **Perder a alteração parcial.** É o caso de borda mais fácil de perder numa reescrita, porque ninguém procura por ele | Pergunta 22 | T009 fixa a semântica em teste, com os três casos da tabela da Pergunta 22 |
| **A ficha cresce sem limite.** No legado a ficha renderizava todas as visitas de todos os animais, sem paginação, e nada era apagado | Pergunta 19 | a paginação do histórico é parte de CA-6.2 e tem tarefa própria, T012 |
