# Plano, Busca e navegação de donos

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

- **P-05** só PostgreSQL: CA-4.2 lê-se "no PostgreSQL". O sobrenome é buscado ignorando
  caixa (`ILIKE` ou índice em `LOWER`), e o teste roda contra o banco real.
- **P-06** página de 10 itens por padrão, faixa de 5 a 50.
- **D08** p95 abaixo de 500 ms com 50 mil donos sintéticos; a medição entra como teste de
  desempenho separado, chamado por `npm run verify:perf`, fora do veredito rápido.
- **D04** a listagem exige login, sem exceção.

## Modelo de dados

Esta feature **não cria entidade nova**. Ela lê o Dono modelado pela feature 001, e o que
ela acrescenta é índice e normalização, não campo.

| elemento | no legado | no modelo novo |
|---|---|---|
| `last_name` do Dono | texto de 30, com índice próprio (`owners_last_name`); o tipo da coluna decidia a sensibilidade à caixa: tipo que ignora caixa em H2, colação não declarada em MySQL e texto puro, sensível à caixa, em PostgreSQL | **o índice continua, a decisão de caixa sai da coluna.** A normalização passa a ser feita pela aplicação antes de montar o filtro, e o índice precisa cobrir a forma normalizada, sob pena de a busca deixar de usar índice e CA-5.1 ficar inalcançável |
| nomes dos animais na listagem | concatenação dos nomes dos animais de cada dono, montada na própria página | mesma informação, e vale registrar o que ela **não** é: no legado essa coluna parecia contagem de animais e era concatenação de nomes |
| tamanho da página | uma variável local com valor cinco | **parâmetro de configuração** (CA-2.4), com valor padrão e faixa permitida ainda a definir (ver Perguntas em aberto da spec) |

**Massa de dados para medir.** CA-5.2 exige base com volume representativo. Os dez donos da
carga de exemplo do legado não servem, e não existe base de produção, porque o sistema nunca
operou de verdade (Pergunta 13). O volume representativo precisa ser **gerado**, e o número
é pergunta em aberto.

## Contratos

O protocolo depende da stack, que está em aberto; por isso nenhuma rota é fixada. O que está
fixado é entrada, saída e erro, porque isso é contrato pelo princípio P9.

| operação | entrada | saída | erros |
|---|---|---|---|
| Buscar donos | começo do sobrenome, podendo vir vazio; número de página; tamanho de página pela configuração | uma de três saídas, e a escolha entre elas é parte do contrato: a **ficha** de um dono quando o resultado tem exatamente um; a **página** da listagem quando tem dois ou mais, com contato e nomes dos animais; o **formulário com erro de campo** quando tem zero | zero resultados não é erro de sistema e sim erro de campo no sobrenome (CA-1.4). A operação não grava nada (CA-1.5) |
| Pedir uma página do resultado | o mesmo começo de sobrenome da busca, mais o número de página | a página pedida, **sempre com o filtro preservado** | página menor que um, maior que o total, negativa ou não numérica levam à primeira página do mesmo resultado, sem falha e sem expor a causa (CA-2.2); base vazia responde a primeira página vazia e não produz desvio novo (CA-2.3) |

**O filtro faz parte do endereço de toda página.** É o que o legado errava: o controlador
preservava o sobrenome ao desviar e os links da página montavam o endereço sem ele. O
contrato tem de dizer que o termo procurado acompanha **cada** link de navegação, e isso
precisa de teste no nível da página, não só no da operação.

**O termo chega normalizado ao repositório.** Espaços nas pontas removidos (CA-1.3), caixa
normalizada (CA-4.1), e termo vazio traduzido para "casa com todo sobrenome" em vez de
"sobrenome igual a vazio" (CA-1.2). Essa última distinção é a diferença entre devolver a
base inteira e devolver nada.

## Migração de dados

Nada a migrar. Esta feature não tem dado próprio: ela consulta o Dono, cuja migração é da
feature 001, e o sistema legado nunca operou de verdade (Pergunta 13), logo não existe base
de busca a converter.

Duas coisas precisam **nascer** com a feature, e nenhuma delas é dado de negócio:

- **O índice sobre a forma normalizada do sobrenome**, na mesma migração que criar a coluna
  ou numa migração própria logo depois. Sem ele a busca funciona e não escala, e o sintoma
  aparece só com volume, que é justamente o que não existe em desenvolvimento.
- **A massa de volume representativo** para a medição de CA-5.2, gerada, nunca copiada de
  base real, porque base real com dado pessoal não existe neste projeto e não deve passar a
  existir em ambiente de teste.

## Sequência

Ordem interna, pelas dependências declaradas nos cards:

1. **US-1 (REQ-008)** abre a feature e é pré-requisito de todas as outras quatro.
2. **US-4 (REQ-011)** depende de US-1 e deve vir logo em seguida, antes de a busca ganhar
   volume: a normalização da caixa muda o índice, e mudar índice depois de haver dado custa
   mais.
3. **US-2 (REQ-009)** depende de US-1.
4. **US-3 (REQ-010)** depende de US-1 e, fora desta feature, da ficha do dono, que é US-6 da
   feature 001.
5. **US-5 (REQ-012)** depende de US-1 e de duas decisões humanas.

**O que esta feature exige de outras:** a feature 001, inteira no que diz respeito ao Dono
e à ficha. US-3 não tem para onde levar sem a ficha, e US-1 não tem o que listar sem o
cadastro.

**O que outras features exigem desta:** nenhuma depende dela por card. A feature 008 trata o
erro de dono inexistente que pode ser alcançado a partir da listagem.

## Riscos

| risco | de onde vem | o que fazer |
|---|---|---|
| **A correção do filtro de paginação ser feita só no controlador.** No legado a regra existia no controlador e era desfeita no template; corrigir o lado que já estava certo não corrige nada | defeito confirmado BUG-UI-01, registrado em `domain.md` §2.2 | T006 e T007: o teste que prova CA-2.1 tem de percorrer o link de navegação da página, não apenas chamar a operação de busca |
| **Laço infinito de redirecionamento com a base vazia.** No legado o desvio de faixa só terminava por causa do piso de uma página no total | achado do grafo de arquitetura: os dois auto-redirecionamentos do sistema terminam apenas por esse piso, e o desvio é o conteúdo do único commit do repositório | T005 entrega a guarda de faixa com o piso explícito, e `UT-009-4` é o teste que falha se o piso for removido |
| **A insensibilidade à caixa voltar a depender do banco.** É como o legado fazia, e a divergência não era anunciada | REG-14 e a dúvida D-DET-08 | T004: a normalização é da aplicação e o teste verifica o filtro entregue ao repositório, não o resultado; assim ele falha mesmo rodando contra um banco que já ignora a caixa |
| **A busca deixar de usar índice depois da normalização.** Normalizar na aplicação e consultar a coluna crua faz o banco varrer a tabela | consequência direta da decisão de US-4, não observável sem volume | o índice sobre a forma normalizada entra na mesma tarefa da normalização, T004, e não em tarefa posterior |
| **CA-5.1 e CA-5.2 não serem verificáveis.** Sem limite de tempo e sem volume acordados, o critério é desejo, não teste | o próprio card REQ-012 nasceu bloqueado por isso; a análise não tem volumetria nem métrica | US-5 entrega apenas a forma da consulta, em T010, e os dois critérios vão para `Sem tarefa` até os números existirem |
| **A listagem completa sem filtro.** CA-1.2 preserva um caminho que devolve a base de clientes inteira, com endereço e telefone, e duas respostas humanas discordam sobre quem pode alcançá-lo | Perguntas 8 e 9, em conflito | não arbitrar aqui. A tarefa entrega o comportamento do card e o conflito fica registrado em Perguntas em aberto, para a feature 007 resolver com a decisão humana |
