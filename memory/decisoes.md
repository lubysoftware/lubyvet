# Decisões humanas para o desenvolvimento

> Registradas em 2026-10-07, em sessão com Rodrigo Gardin, depois da geração do pacote.
> Este arquivo **prevalece** sobre `questions.md` do legado e sobre qualquer trecho de
> spec, plano ou tarefa que diga o contrário. Onde uma decisão aqui reescreve um critério
> de aceite, a spec da feature já foi alterada para citar o número da decisão.
>
> Três categorias, e a diferença importa:
>
> - **Decidido (D01 a D44):** resposta humana. O agente de codificação aplica sem perguntar.
> - **Padrão proposto (P-01 a P-25):** valor sensato escolhido para não travar o início,
>   **revisável**. O agente aplica, mas qualquer pessoa pode trocar sem custo de arbitragem.
> - **Ainda aberto:** nada. A-01 a A-06 viraram D24 a D29, e A-07 virou D36. Os pontos marcados com *confirmar* dependem de
>   verificação externa.

## 1. Os três conflitos, arbitrados

**D01. O veterinário entra no atendimento, como campo opcional.**
O atendimento realizado *pode* registrar qual veterinário atendeu, escolhido entre os
veterinários ativos do catálogo. Não é obrigatório.
Consequências: CA-4.2 da 004 passa a dizer "pode registrar"; CA-4.4 da 004 responde a partir
dos atendimentos que registraram veterinário; `UT-046-4` da 009 deixa de ser inexecutável;
desligar um veterinário (009) preserva os atendimentos já registrados com ele.
Substitui a resposta da Pergunta 2 no ponto em que ela tirava o veterinário da operação.

**D02. Toda gravação registra quem a fez, por pessoa.**
Login individual, sem conta compartilhada por função. Dono, animal, agendamento e
atendimento ganham `criado_por` e `alterado_por` (referência ao usuário), além de
`criado_em` e `alterado_em`. A autoria não é alterável pelos caminhos normais do sistema.
Consequências: CA-4.1 e CA-4.2 da 007 entram no pronto. Substitui a resposta da Pergunta 12.

**D03. A superfície de gestão é protegida; só as sondas ficam abertas.**
`liveness` e `readiness` respondem sem credencial, e só com o estado agregado. Todo o resto
(configuração, ambiente, métricas, informação de build) exige o papel Administrador (D18).
Consequências: CA-4.1, CA-4.2 e CA-4.3 da 008 entram no pronto. Resolve o item 6 do Não
negociável. Substitui a resposta da Pergunta 10.

**D04. A listagem completa da base de donos exige login.**
Sem exceção: todo caminho que lê dado pessoal exige identificação. A exceção nomeada que a
007 previa para a Pergunta 9 deixa de existir. CA-1.1 da 007 fica integral.

## 2. Números

**D05. País de operação: Brasil.**
O telefone do dono passa a ser **celular brasileiro**, porque é o destino do WhatsApp (D12):
DDD válido mais nove dígitos começando por 9. A entrada aceita máscara; o valor é gravado
normalizado em E.164 (`+55DDNNNNNNNNN`) e exibido formatado. Exemplos de teste de CA-2.3:
válido `(11) 98765-4321`; inválido `1234567890` (padrão EUA do legado) e `(11) 3456-7890`
(fixo). CA-2.1 da 001 deixa de dizer "gravado exatamente como informado" e passa a dizer
"gravado normalizado".

**D06. Janela de retroatividade do atendimento: sem limite.**
Um atendimento aceita qualquer data passada ou a data de hoje, e recusa data futura. CA-3.2
da 004 é reescrito nesses termos.

**D07. Acessibilidade: WCAG 2.2 nível AA.**
Contraste mínimo de 4,5:1 para texto normal e 3:1 para texto grande e componentes de
interface, inclusive nos estados de foco e de passagem do ponteiro. Foco sempre visível.

**D08. Desempenho da busca e da listagem de donos: p95 abaixo de 500 ms com 50 mil donos.**
A massa é sintética, gerada pelo teste, nunca copiada de base real. CA-5.1 e CA-5.2 da 002
entram no pronto.

## 3. Domínio

**D09. Situações do animal: Ativo, Falecido, Transferido.**
Transições: Ativo → Falecido e Ativo → Transferido. A volta para Ativo é correção de erro e
só o Administrador faz. Falecido e Transferido continuam na ficha do dono com todo o
histórico, **não aceitam agendamento novo** e continuam contando para a unicidade de nome
por dono. "Transferido" significa que o animal saiu da clínica; trocar o animal de dono
dentro do sistema não faz parte do escopo (P-14).

**D10. Situações do agendamento: Agendada → Realizada | Cancelada | Não compareceu.**
Os três estados de destino são finais. Cancelar só é possível enquanto a data não passou.
Registrar o atendimento leva o agendamento para Realizada.

**D11. Ninguém muda a situação do agendamento sozinho.**
Não existe processo que transite estado com a passagem do tempo. Agendamento com data
passada e ainda Agendada é **pendente de registro**: um estado derivado, calculado na
leitura, que a tela destaca para o atendente fechar como Realizada ou Não compareceu.

**D12. Notificação ao dono por WhatsApp, pela Meta Cloud API, ao agendar e no D-1.**
- Duas mensagens: confirmação no momento do agendamento e lembrete na véspera.
- Integração direta com a Meta Cloud API, sem intermediário.
- Saída por uma porta `NotificacaoAoDono` com o adaptador da Meta; o envio passa pelo
  RabbitMQ com retentativa e fila de descarte, e a gravação do agendamento nunca falha
  por causa da notificação.
- O lembrete do D-1 é publicado por uma tarefa diária (`CronJob` do Kubernetes). Ela só
  **envia mensagem**; não muda estado, então não contradiz D11.
- Agendamento cancelado antes do D-1 não recebe lembrete.
- O dono precisa ter **consentimento registrado** para receber mensagens (LGPD e política
  da Meta). Sem consentimento, o sistema não envia e não falha.
- Pré-requisitos externos, que dependem de pessoa e não de código: conta Business
  verificada, número dedicado e os dois templates aprovados na Meta (ver D28). Até lá,
  o adaptador falso registra a mensagem em log e o resto do fluxo funciona.

**D13. Dados obrigatórios do dono: nome, sobrenome, endereço, cidade, celular e CPF.**
E-mail é opcional: formato válido, até 254 caracteres. CPF é validado pelo dígito
verificador e gravado só com os dígitos. O dono ganha também o campo de consentimento de
mensagens (D12).

**D14. "Dono parecido": mesmo celular.**
Ao gravar um dono cujo celular já pertence a outro dono, o sistema mostra o candidato e
pede confirmação. É aviso dispensável, como a Pergunta 18 pediu. O CPF não entra aqui
porque bloqueia (D15). CA-3.1 da 001 entra no pronto.

**D15. CPF é único e bloqueia.**
Índice único parcial sobre o CPF, valendo só quando ele está presente: um dono anonimizado
tem CPF nulo e libera o valor. CPF repetido é recusado no próprio campo, com mensagem do
catálogo, e o erro é reconhecido **pelo tipo** (P6). É uma exceção à Pergunta 18, só para
o CPF.

**D16. A proteção contra dupla submissão vale para todos os formulários de gravação.**
Dono, animal, agendamento, atendimento, vocabulários e usuários usam um mecanismo genérico:
um token de idempotência por renderização do formulário.

## 4. Identidade e acesso

**D17. A identidade mora numa tabela própria no PostgreSQL.**
O usuário tem nome, login, hash da senha (argon2id), papel e situação (ativo ou inativo).
A autenticação e a autorização ficam em guards do NestJS, decididas num ponto só por
requisição. Não há autocadastro: o Administrador cria usuários e redefine senhas (P-15).

**D18. Papéis: Leitura, Escrita e Administrador.**
Só o Administrador mantém os vocabulários (espécies, veterinários, especialidades),
anonimiza dado pessoal, gerencia usuários, corrige a situação de animal (D09) e acessa a
superfície de gestão (D03).

**D19. A sessão expira após 8 horas de inatividade.**

## 5. Escopo técnico

**D20. A stack de `.specify/arquitetura/decision.json` fica como decidida.**

| parte | escolha |
|---|---|
| arquitetura | Portas e adaptadores |
| linguagem e framework | TypeScript e NestJS |
| apresentação | ~~templates renderizados no servidor~~ → **Next.js (React) + Tailwind + shadcn/ui na frente do NestJS** (D31) |
| banco | PostgreSQL, **único dialeto** (resolve P5 e o item 5 do Não negociável), rodando no cluster pelo CloudNativePG (D36) |
| acesso a dados e migrações | Prisma e Prisma Migrate, com `@map` explícito em toda coluna (P3); o índice sobre `LOWER(name)` vai em SQL cru dentro da migração |
| cache | Redis, invalidável e compartilhado entre réplicas |
| mensageria | RabbitMQ, para a notificação de D12 |
| autenticação | guards no adaptador (D17) |
| observabilidade | instrumentação neutra (OpenTelemetry) |
| testes | Jest com PostgreSQL real em contêiner na API; Vitest e Playwright no front (P-21) |
| entrega | Kubernetes agnóstico de provedor, por Helm chart (D36) |

Resolve o item 4 do Não negociável.

**D21. O legado é clonado e testado antes da primeira feature.**
O upstream do `spring-projects/spring-petclinic` foi clonado em `~/projects/spring-petclinic`
para rodar `./mvnw test`, para o dicionário de nomes de coluna (P3) e como referência das
telas. O resultado da suíte está registrado em §8.

**D22. Não há rota de dados do catálogo para sistema externo.**
Não existe consumidor real, então US-4 da 005 (catálogo como dados para outro sistema) sai
do pronto. *Ajustada por D31:* com o front em Next.js, o catálogo é servido pela API ao
**próprio front**. Essa rota é interna ao sistema, não é integração, e continua sem
nenhum campo de estado de persistência (US-5 da 005).

**D23. A identidade visual é nova: LubyVet.**
Paleta nova que passa em D07 e Tailwind como compilador de estilo. *Detalhada em D37:* a
direção é a "Clínica calma" e a fonte é **Figtree** (substitui a Inter proposta aqui), com
os arquivos no próprio projeto. Nada da folha nem do tema do
legado é reaproveitado, o que já era o caso por REQ-047.

## 6. Padrões propostos (revisáveis)

| id | assunto | valor |
|---|---|---|
| P-01 | idioma padrão | `pt-BR` |
| P-02 | idiomas suportados | `pt-BR` e `en`. O catálogo é completo nos dois (P7); idioma novo é só arquivo novo |
| P-03 | data e número | seguem o idioma, inclusive a data de nascimento do animal |
| P-04 | seletor de idioma | aparece em todas as telas, inclusive nas de erro da 008 |
| P-05 | bancos homologados | só PostgreSQL (consequência de D20). Os critérios "em todos os bancos homologados" leem-se "no PostgreSQL" |
| P-06 | paginação | 10 itens por padrão; o tamanho aceita de 5 a 50; valor fora da faixa é recusado com mensagem |
| P-07 | ordenação do catálogo | sobrenome, depois nome, ignorando caixa e acento |
| P-08 | cache do catálogo | invalidado em toda escrita de vocabulário, com TTL de segurança de 10 minutos |
| P-09 | situações do veterinário | Ativo e Desligado. O Administrador pode reativar. Desligado sai do catálogo público e da escolha no atendimento, e continua no histórico |
| P-10 | situações da espécie | Ativa e Inativa. O formulário envia o identificador da espécie, nunca o nome, para que renomear não quebre nada. A comparação ignora caixa no banco (índice único em `LOWER(name)`) e na aplicação |
| P-11 | especialidade | criada e mantida pelo Administrador |
| P-12 | o dono é ator do sistema? | Não. Só a equipe da clínica faz login |
| P-13 | credenciais | `Secret`s do Kubernetes consumidos por nome; o mecanismo que os preenche é do cluster (D36). Nenhum valor em arquivo do repositório (item 8 do Não negociável) |
| P-14 | trocar animal de dono | fora de escopo (P1 e D09) |
| P-15 | senha | mínimo de 12 caracteres; 5 tentativas erradas bloqueiam o login por 15 minutos; o Administrador redefine a senha |
| P-16 | log e observabilidade | OpenTelemetry exportando para o Grafana da casa; log estruturado sem dado pessoal, retido por 30 dias. Sondas: liveness com timeout de 1 s, período de 10 s e 3 falhas; readiness com timeout de 2 s |
| P-17 | build canônico (P8) | `npm run verify` roda build, lint, testes e cobertura com um só veredito. `./run.sh verify` e a CI chamam esse mesmo comando, e o lockfile vem desde o primeiro commit |

## 7. Pendências refinadas (antes A-01 a A-06)

**D24. A eliminação a pedido anonimiza o dono e preserva todo o histórico clínico.** *(antes A-01)*
Animais, agendamentos e atendimentos ficam para sempre, ligados a um dono anonimizado. A
base legal é o cumprimento de obrigação regulatória (LGPD, art. 16, I). Não existe rotina
de expurgo por prazo.
*Confirmar com o jurídico:* o prazo mínimo de guarda do prontuário exigido pelo CFMV,
citado como cinco anos. A referência não foi verificada nesta sessão. Se o jurídico
apontar prazo máximo, a decisão muda.

**D25. Texto livre passa por revisão do Administrador na anonimização.** *(antes A-02)*
- Ao anonimizar um dono, o sistema lista todos os textos livres ligados a ele (descrições
  de agendamento e campos do atendimento).
- Nome, sobrenome, CPF, celular e e-mail dele aparecem destacados, em comparação que
  ignora caixa, acento e máscara.
- O Administrador confirma, trecho a trecho, a troca por `[removido]`. O restante do texto
  clínico fica intacto. Substituir um trecho é anonimizar, não apagar (P2).
- A revisão é registrada com data e Administrador (D02).
- A anonimização dos campos estruturados não espera a revisão. O dono fica com a marca
  "revisão de texto livre pendente" até ela terminar.

**D26. O atendimento realizado tem campos clínicos enxutos.** *(antes A-03)*

| campo | tipo | obrigatório |
|---|---|---|
| data | data, passada ou de hoje (D06) | sim |
| queixa principal | texto, até 500 | sim |
| peso | decimal em kg, de 0,01 a 999,99 | não |
| diagnóstico | texto, até 2000 | não |
| conduta / tratamento | texto, até 2000 | não |
| data de retorno | data futura | não |
| veterinário | referência a um veterinário ativo (D01) | não |

Os limites valem na validação e no esquema, com o mesmo número (P3). A data de retorno não
cria agendamento sozinha; a ficha a mostra como sugestão para o atendente agendar.

**D27. Indicadores de uso: agenda, atendimento, base de clientes e WhatsApp.** *(antes A-04)*
Todos são métricas agregadas, sem dado pessoal, expostas por OpenTelemetry para o Grafana
(P-16), e calculadas a partir de eventos de domínio, nunca por varredura de log.

| grupo | métricas |
|---|---|
| agenda | agendamentos criados por dia; cancelamentos; não comparecimentos; taxa de não comparecimento; pendentes de registro (gauge) |
| atendimento | atendimentos por dia; atendimentos por veterinário (rótulo com o id, nunca o nome); retornos sugeridos |
| base de clientes | novos donos e novos animais por mês; avisos de dono parecido exibidos e dispensados; anonimizações |
| WhatsApp | mensagens enfileiradas, enviadas, entregues e com falha por tipo; tamanho da fila de descarte; agendamentos sem mensagem por falta de consentimento |

"Entregue" exige o status de entrega da Meta, que chega por webhook. Como D28 não tem
webhook, nesta versão a métrica para em "enviada" (aceita pela API). "Entregue" fica
registrada como evolução.

**D28. WhatsApp: os dois templates, só de ida, com a conta de teste.** *(antes A-05 e A-06)*
- Os templates são da categoria `utility`, em `pt_BR`. **Não têm botões:** sem webhook de
  entrada, a resposta a um botão chegaria num número da Cloud API que ninguém lê.

`lubyvet_confirmacao`
> Olá, {{1}}! A consulta de {{2}} está agendada para {{3}} às {{4}} na {{5}}.
> Para remarcar, fale com a clínica pelo {{6}}.

`lubyvet_lembrete`
> Olá, {{1}}! Lembrete: amanhã, {{2}}, às {{3}}, {{4}} tem consulta na {{5}}.
> Para remarcar, fale com a clínica pelo {{6}}.

| variável | confirmação | lembrete |
|---|---|---|
| {{1}} | primeiro nome do dono | primeiro nome do dono |
| {{2}} | nome do animal | data (`dd/mm`) |
| {{3}} | data (`dd/mm`) | hora (`HH:mm`) |
| {{4}} | hora (`HH:mm`) | nome do animal |
| {{5}} | nome da clínica | nome da clínica |
| {{6}} | telefone da clínica | telefone da clínica |

- O nome e o telefone da clínica vêm de configuração, não do banco.
- A mensagem é só de ida: não existe webhook de entrada, nem para resposta nem para status
  de entrega.
- Uma resposta do dono ao número da Cloud API se perde. A linha "fale com a clínica pelo
  {{6}}" existe para que isso não aconteça, e {{6}} **deve ser outro número**, que alguém
  da clínica lê.
- Conta: não existe ainda. Desenvolvimento e homologação usam o número de teste gratuito da
  Cloud API, que aceita até 5 destinatários cadastrados. Produção espera a conta Business
  verificada, um número dedicado e os dois templates aprovados. Até lá, o adaptador real
  fica desligado fora da homologação.

**D29. O lembrete sai às 10h do dia anterior.**
É um `CronJob` diário às `10:00` no fuso `America/Sao_Paulo`. Agendamento criado depois das
10h para o dia seguinte não recebe lembrete; ele já recebeu a confirmação na hora.

## 8. Resultado da suíte do legado (D21)

Rodada em 2026-10-07 sobre o commit `500158f` do upstream (29/09/2026), com
`./mvnw -B test` em Java 17 e o perfil padrão (H2):

- **79 testes, 0 falhas, 0 erros, 2 pulados.**
- Os pulados são os de `MySqlIntegrationTests`. `PostgresIntegrationTests` rodou zero
  testes. Os dois usam Testcontainers e o Docker não estava ativo nesta máquina.
- O upstream de hoje tem 18 suítes e já inclui `PetClinicConcurrencyTests`. A análise do
  pacote contou 20 arquivos de teste numa versão anterior.

O que isso fecha e o que não fecha:

- Fecha o comportamento do **perfil padrão**, que passa a servir de referência executável.
- **Não fecha** a parte das contradições C2 e C4 que depende de dialeto: a restrição
  anônima no MySQL e a unicidade de veterinário com especialidade que faltava no H2. Para
  observá-las é preciso subir o Docker e rodar de novo. Para o projeto novo isso deixou de
  importar: D20 elege um dialeto só, P6 reconhece o erro pelo tipo e a Pergunta 6 já
  arbitrou C4.
- C1 já estava arbitrada pela Pergunta 5: a espécie é obrigatória sempre.

Para repetir com os bancos reais: subir o Docker e rodar `cd ~/projects/spring-petclinic && ./mvnw test`.

## 9. Tech spec (2026-10-07, terceira sessão)

**D30. Uma clínica por implantação.**
Cada clínica cliente tem a própria instância e o próprio banco. Não existe `clinica_id` e
nada nas specs muda. O nome e o telefone da clínica (D28) e as credenciais da Meta vêm de
configuração da implantação. Atender outra clínica é fazer outro deploy.

**D31. A apresentação é Next.js (React) na frente do NestJS.**
Substitui a linha "templates renderizados no servidor" de D20, que era a recomendação
`templates-no-servidor` do tech spec; esta é a alternativa `spa-com-api-json` com
renderização no servidor.
- O **NestJS é a única porta** para domínio, banco, cache e fila. O Next.js não acessa o
  banco nem implementa regra de negócio: é o adaptador de apresentação.
- O navegador fala **só com o Next.js**. O Next.js reescreve `/api/*` para o NestJS, que
  roda como serviço interno do cluster, sem rota pública própria.
- A sessão (D17, D19) é do NestJS: cookie `httpOnly`, `secure`, `sameSite=lax`, no mesmo
  domínio. Os Server Components repassam o cookie da requisição ao chamar a API.
- O contrato público (P9) passa a ser a API JSON. "Termina na ficha" vira navegação após
  sucesso; "devolve o formulário com o campo marcado" vira resposta 422 com erros por campo,
  exibidos no próprio campo.
- A proteção contra dupla submissão (D16) é uma chave de idempotência por formulário,
  enviada em cabeçalho e verificada pelo NestJS.
- Os textos visíveis (P7) moram nos catálogos do front. A API devolve **códigos** de erro
  e de mensagem, nunca texto, e o teste de completude cobre os códigos que a API pode emitir.

**D32. O contrato é escrito em zod, num pacote compartilhado, e gera o OpenAPI.**
- O pacote `contracts` declara, para cada rota, o schema de entrada, o de saída e os
  códigos de erro.
- O NestJS valida com esses schemas, o formulário valida com os mesmos (react-hook-form
  com zod), e o OpenAPI é gerado deles e versionado: é o arquivo de contrato de P9.
- Os limites de tamanho são definidos uma vez e usados pelo zod e pelo schema do Prisma, e
  um teste compara os dois (P3, P6).
- Mudar o OpenAPI versionado sem mudar o contrato (ou o contrário) reprova
  `npm run verify`.

**D33. Prisma é mantido como acesso a dados.**
A recomendação do tech spec foi confirmada. Os riscos dele ficam com mitigação explícita:
- **P3:** `@map`/`@@map` em toda coluna e tabela, e um teste que compara o schema Prisma
  com o banco migrado coluna por coluna (T002 de cada feature).
- **Índice sobre `LOWER(name)`:** SQL cru dentro da migração, com um teste que tenta
  inserir nomes que diferem só na caixa e espera a recusa.
- **Divergência entre schema e migrações:** `prisma migrate diff` dentro de
  `npm run verify` falha se o schema e o diretório de migrações divergirem.
- **Concorrência otimista (US-5 da 001):** `updateMany` com `where: { id, version }`, e
  zero linhas afetadas significa versão vencida.
- **Domínio:** o tipo gerado pelo Prisma não sai do adaptador. O domínio tem os próprios
  tipos, e uma regra de import em `verify` impede `@prisma/client` fora de `infra/`.

**D34.** ~~Kubernetes gerenciado, com PostgreSQL gerenciado do mesmo provedor~~ —
**substituída por D36.**

**D36. Kubernetes agnóstico de provedor: tudo roda dentro do cluster.** *(fecha A-07)*
O produto é um **Helm chart** que implanta em qualquer Kubernetes conforme (gerenciado em
qualquer nuvem ou on-premise), sem depender de serviço gerenciado de nenhum provedor. Com
D30, cada clínica é uma instalação do chart.

| peça | como roda |
|---|---|
| PostgreSQL | operador **CloudNativePG**: cluster com primário e réplica, backup contínuo (WAL) e base diária para armazenamento de objetos compatível com S3, e recuperação para um ponto no tempo |
| Redis | dentro do cluster, sem persistência obrigatória (cache e sessão); perder o Redis derruba sessões, não dados |
| RabbitMQ | **RabbitMQ Cluster Operator** oficial, com fila durável; o outbox no Postgres (T023 da 004) garante que nada se perde se a fila cair |
| entrada HTTP | Gateway API, com TLS por cert-manager; só o Next.js é exposto (D31) |
| segredos | o chart consome `Secret`s existentes por nome. Como eles são preenchidos (External Secrets, Sealed Secrets, Vault) é escolha do cluster; nenhum valor fica no repositório nem no `values.yaml` |
| observabilidade | OpenTelemetry Collector no cluster, exportando para um destino configurável (P-16) |

- **Isso contraria a recomendação `postgresql-gerenciado` do tech spec, e o motivo dela
  continua valendo.** O banco do legado no cluster era efêmero e sem backup (DT-19), e os
  dados são pessoais (D24 manda preservar todo o histórico clínico). Por isso o backup
  deixa de ser configuração e vira entrega com teste: um ensaio de restauração automatizado
  (T023 da 008), sem o qual a feature 008 não fecha.
- **Pré-requisitos do cluster**, que o chart documenta e verifica na instalação: uma
  `StorageClass` com volume `ReadWriteOnce`, um bucket S3-compatível **fora do cluster**
  para os backups, um controlador de Gateway API, o cert-manager e os dois operadores.
- Imagens são fixadas por digest e vêm das fontes oficiais de cada projeto, sem depender de
  catálogos de terceiros cuja política de distribuição pode mudar.
- O desenvolvimento local continua com Docker Compose (D34). O chart é testado num cluster
  efêmero (kind) na CI.

**D35. Componentes de interface: shadcn/ui.**
Radix com Tailwind, copiados para o projeto e tematizados com a paleta LubyVet (D23). A
acessibilidade dos componentes não dispensa a verificação de D07.

| id | assunto | valor proposto (revisável) |
|---|---|---|
| P-18 | estrutura | monorepo com npm workspaces: `apps/api` (NestJS), `apps/web` (Next.js, App Router), `packages/contracts` (zod). O worker do RabbitMQ e o comando do D-1 são outros entrypoints da mesma imagem da API |
| P-19 | runtime | Node 24 LTS, fixado em `.nvmrc` e em `engines`, com lockfile desde o primeiro commit |
| P-20 | idiomas no front | `next-intl`, com idioma em cookie (P-01 a P-04) |
| P-21 | testes do front | Vitest e Testing Library para componentes; Playwright para e2e e axe (D07); `npm run verify` roda as duas suítes |
| P-22 | dados no front | Server Components para leitura; mutações por Route Handlers ou fetch do cliente com TanStack Query, sempre via `/api` |
| P-23 | build canônico | revisa P-17: `npm run verify` na raiz roda lint, typecheck, testes, cobertura, `prisma migrate diff`, a regra de fronteira e a verificação do OpenAPI de todos os workspaces |

| id | aberto | o que trava | quem responde |
|---|---|---|---|
| — | nada em aberto: A-07 virou D36 | — | — |

## 10. Estilo visual (2026-10-07, quarta sessão)

**D37. Direção visual "Clínica calma".**
Escolhida entre três direções comparadas na mesma tela (a ficha do dono). A maquete está
em https://claude.ai/artifact/Nx6EzsQLCJYnwMqKrfvSvv. É um verde-azulado de consultório,
com um âmbar quente só para o que pede atenção.

*Paleta (tokens do Tailwind e do tema shadcn/ui):*

| token | claro | escuro | contraste medido |
|---|---|---|---|
| `background` | `#FBFCFB` | `#0E1A18` | — |
| `surface` | `#EEF4F2` | `#162724` | — |
| `foreground` | `#14302C` | `#EAF2EF` | 13,7 / 15,6 sobre o fundo |
| `muted-foreground` | `#4F6661` | `#A7BDB7` | 5,5 / 7,9 sobre `surface` |
| `primary` | `#0B6B63` | `#4FC1B3` | 6,2 / 8,1 sobre o fundo |
| `primary-foreground` | `#FFFFFF` | `#0E1A18` | 6,4 / 8,1 sobre `primary` |
| `accent` | `#B86E0A` | `#F0B456` | 3,9 / 9,6: **no claro, só ícone, borda e texto grande**, nunca texto corrido |
| `border` | `#D5E2DE` | `#24403B` | — |
| `destructive` (erro de campo) | `#B42318` | `#F97066` | AA texto nos dois |

*Situações (semânticas, independentes do `accent`):*

| situação | fundo / texto no claro | no escuro |
|---|---|---|
| Agendada | `#E6F0FB` / `#1D4F86` | `#1A2B44` / `#9CC4F2` |
| Realizada | `#E3F3E8` / `#1B6337` | `#16301F` / `#94D8AC` |
| Cancelada | `#EDEEF1` / `#474C58` | `#272A31` / `#B7BCC7` |
| Não compareceu | `#FBE7E7` / `#9B2226` | `#3A1A1C` / `#F2A3A6` |
| Pendente de registro | `#FFF1CF` / `#734606`, linha `#FFFAEC` | `#3A2C10` / `#F5CB73`, linha `#211C10` |

*Tipografia:*
- Figtree 400, 500, 600 e 700, com os arquivos no projeto (CA-2.2 da 010).
- Números tabulares (`font-variant-numeric: tabular-nums`) em data, hora, peso e CPF.
- Rótulos de campo e cabeçalho de tabela em caixa alta pequena, com espaçamento de
  0,06em.

*Forma:*
- Raio de 8px em controles e cartões.
- Menu lateral claro, integrado à página (`surface`).
- A situação aparece sempre como selo arredondado, com a cor da tabela acima.
- A linha pendente de registro recebe o fundo próprio.

**D38. Modo escuro desde a primeira versão.**
- Segue a preferência do sistema e tem troca manual (claro, escuro ou sistema),
  guardada em cookie, como o idioma (P-20).
- A verificação de contraste de D07 roda nos dois modos. Uma tela nova só fecha com os
  dois aprovados.

**D39. Densidade confortável.**
Controles e linhas de tabela com 44px de altura, o que dá alvo de toque folgado: o WCAG
2.2 exige no mínimo 24px. O espaçamento base é de 4px.

**D40. A marca por instalação troca logo e nome; as cores não.**
Cada clínica (D30) configura no deploy o nome e o logo, nas versões clara e escura. A
paleta de D37 é fixa, então o contraste continua garantido sem validação na instalação.
O nome da clínica configurado aqui é o mesmo dos templates de WhatsApp (D28).

**D41. Ícones Lucide; o logo do LubyVet ainda será criado.**
- Os ícones são do Lucide, que já vem com o shadcn/ui, inclusive os de espécie: cachorro,
  gato, ave, coelho e peixe. Espécie sem ícone próprio usa um ícone genérico de pata.
- O logo do LubyVet é um item de design à parte. Até ele existir, vale um logotipo
  tipográfico provisório ("LubyVet" em Figtree 700, com a sílaba "Vet" na cor `primary`).
- Ícone sozinho, sem texto, sempre tem rótulo acessível.

**D42. O design system do LubyVet é próprio, não um template clonado.**
- Publicado em https://claude.ai/artifact/23K7PeRUqVMc6XjjvWY8Lj. A fonte de verdade é o
  `tokens.json` dele: cores nos dois temas, tipografia, espaço, raio, sombra, tamanhos,
  durações e curvas de movimento.
- Os 19 componentes têm prévia ao vivo e regras de uso, e o mapeamento para as variáveis do
  shadcn/ui e do Tailwind está na seção Implementação.
- Dos templates de referência (Studio Admin, shadcn-admin, shadcn-admin-kit, blocos oficiais
  do shadcn) veio só o vocabulário, redesenhado na direção de D37:
  - menu lateral que recolhe em faixa de ícones, paleta ⌘K, trilha de navegação;
  - abas segmentada e sublinhada, tabela com faceta e estado na URL, painel lateral;
  - gráficos com grade horizontal e área em gradiente;
  - movimento com `tw-animate-css` em 100, 200, 300 e 400ms.
  Nenhum código deles entra no projeto.
- A comparação das referências está em https://claude.ai/artifact/HSwgm7rs4T4Q1H1BrHwZ6D.

## 11. Padrões de código e de teste (2026-10-07, quinta sessão)

**D43. Mensagens de commit em inglês.**
Conventional Commits em inglês, com o escopo do módulo e a referência da tarefa no fim do
título: `feat(owners): reject duplicate CPF with field error (001/T019)`. Resolve, para o
LubyVet, a pendência do `CLAUDE.md` do home sobre a língua do commit.

**D44. Cobertura mínima por camada.**
O `npm run verify` reprova abaixo de 90% de linhas e de ramos no `domain/` e no
`application/` da API, e abaixo de 70% nos componentes de feature do web. Adaptadores não
têm meta numérica: são provados pelos testes de integração e de API.

| id | assunto | valor proposto (revisável) |
|---|---|---|
| P-24 | rotas e envelope de erro | prefixo `/api`; recursos no plural em inglês, aninhados pelo dono (P1); erro como `{ "error": { "code", "fields"? } }`; status 401, 403, 404, 409, 422 e 500 conforme `docs/padroes/contratos.md` |
| P-25 | idempotência | cabeçalho `Idempotency-Key` obrigatório nas gravações (D16), com o resultado guardado por 24 horas |

Os padrões completos estão em `AGENTS.md` e `docs/padroes/`.

> **Nota de 2026-10-07 sobre P-17 e P-23:** o comando é `bun run verify`. O npm encerra sem erro nesta máquina (instalação, scripts com `--workspaces` e cadeias longas), então instalação e scripts usam o bun; os workspaces e o `package.json` continuam os mesmos.

## 12. Dívida técnica da primeira entrega (2026-10-07, sexta sessão)

**D45. Eventos de domínio em processo.** *(fecha a pergunta "Barramento de eventos" da 011)*
Os casos de uso publicam eventos (só ids e tipos, P-16) num barramento em processo, entregue no
mesmo request. O assinante de métricas (D27) é o primeiro consumidor. Evento que precise sair do
processo usa a caixa de saída de D12. Tomada pela recomendação da spec da 011, com autorização
para seguir sem nova consulta.

**D46. Formulários pelo `useApiForm`, ratificado.** *(fecha a pergunta "Formulário" da 011)*
Os formulários seguem não controlados, validados pelo schema de entrada do contrato no
`useApiForm`, que também manda a `Idempotency-Key` e põe o 422 no campo. A recomendação da spec
era react-hook-form; ao executar, a troca acrescentaria um segundo estado de formulário sem
ganho de regra ou de teste, e a CA-5.1 admite a ratificação registrada. Quem quiser
react-hook-form numa tela nova reabre esta decisão.

**D47. Peças de interface pelo CLI do shadcn/ui, via bunx.** *(fecha a pergunta "shadcn/ui pelo CLI" da 011)*
`bunx --bun shadcn@latest add <peça> --path src/components/ui/base` funciona nesta máquina (o
`npx` não). As peças geradas ficam em `components/ui/base/`, ajustadas aos tokens (D42) e à
densidade de D39; as peças do design system em `components/ui/` se apoiam nelas. O `init` não se
usa, porque sobrescreveria os tokens do `globals.css`.

**D48. Rota de leitura das especialidades para a administração.**
`GET /api/admin/specialties` (Administrador, D18) devolve as especialidades em ordem alfabética,
para a tela atribuí-las a um veterinário (009/CA-2.1 e CA-2.2), que a API já aceitava e a tela
não oferecia. É rota nova e só de leitura; criar, renomear ou inativar especialidade continua
fora (P-11 fica para quando houver tela de manutenção).
