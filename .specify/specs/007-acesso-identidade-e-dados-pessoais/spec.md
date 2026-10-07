# Acesso, identidade e dados pessoais

**Origem:** épico EP-7 do backlog do sistema legado (objetivo do épico: saber quem está mexendo no dado pessoal de terceiros e poder apagá-lo quando pedido)
**Cards:** REQ-033, REQ-034, REQ-035, REQ-036

## Por que esta feature existe

O sistema legado guardava nome, endereço e telefone de pessoa física e **não tinha controle de
acesso nenhum**. A ausência não é suposição: está provada por seis varreduras independentes,
sem biblioteca de segurança, sem anotação de autorização, sem cadeia de filtros, sem tabela de
usuário ou papel, sem coluna de autoria e sem proteção contra requisição forjada. Os 17 pares
de método e rota foram listados um a um e **nenhum** exigia identificação. Como os
identificadores eram sequenciais e previsíveis e a rota da ficha não tinha parâmetro
adicional, percorrer os endereços de um em um lia a base de clientes inteira, com os animais e
todo o histórico de visitas, sem autenticação, sem limite de taxa e **sem deixar rastro**,
porque não havia uma única linha de registro de log em todo o código.

A segunda metade do problema é legal. Não existia **nenhum** caminho de exclusão: nem rota, nem
chamada de repositório, nem remoção de órfãos, nem exclusão lógica, nem data de expurgo, e as
quatro chaves estrangeiras não declaravam comportamento ao apagar. O direito de eliminação do
artigo 18 da LGPD não tinha onde se encaixar no modelo, e sem data de criação nem autoria não
se sabia nem o que estaria vencido numa política de retenção. É a única lacuna de toda a
análise com consequência legal, e foi registrada de propósito em três etapas diferentes.

É também a feature em que mais decisões humanas incidem, **e duas delas contradizem critérios
de cards que a mesma pessoa marcou como prontos**. As duas estão registradas abaixo, sem
arbitragem.

## Histórias de usuário

### US-1 (REQ-033) Autenticar quem usa o sistema

Como clínica, quero que só pessoas identificadas acessem os dados dos clientes para que nome,
endereço e telefone não fiquem legíveis a qualquer um que alcance o endereço do sistema.

**Critérios de aceite**

- [ ] CA-1.1 Todo caminho que lê ou escreve dado pessoal exige identificação prévia e recusa quem não a tem
- [ ] CA-1.2 Credencial incorreta recebe erro genérico, sem revelar se o usuário existe
- [ ] CA-1.3 A sessão expira após o tempo definido de inatividade
- [ ] CA-1.4 Existe teste cobrindo o acesso não identificado a cada caminho que lê ou escreve dado pessoal

**Regras de negócio que valem aqui**

- REG-42 no legado não existia usuário: nenhuma entidade tinha autoria e nenhum endpoint exigia identificação (`domain.md` §2.6, `permissions.md`)
- Decisão humana da Pergunta 8: papéis distintos de leitura e de escrita, **sem registro de acesso**

> **Arbitrado em `memory/decisoes.md` D04: a listagem exige login, sem exceção.** Texto original, mantido como histórico: CA-1.1 diz "todo caminho que lê ou
> escreve dado pessoal". A resposta da Pergunta 9 diz o contrário para um caminho específico:
> **manter a listagem completa da base acessível a qualquer requisitante**. Essa listagem
> devolve endereço, cidade e telefone de todos os donos, paginados, e o próprio código do
> legado chamava o termo de busca vazio de "a busca mais ampla possível". As duas instruções
> vêm de pessoas e o agente de codificação não escolhe entre elas, pelo mesmo motivo do item 6
> do Não negociável da constituição. A consequência de cada lado é concreta: com a listagem
> aberta, CA-1.1 é falso para o caminho que expõe mais dado pessoal por requisição depois da
> ficha; com a listagem fechada, uma decisão humana explícita é revertida sem que ninguém a
> tenha revisto.

### US-2 (REQ-034) Restringir as ações de cada pessoa ao seu papel

Como clínica, quero que cada pessoa só possa fazer o que o papel dela permite para que a
recepção não altere o que é do corpo clínico e nenhum cliente veja a ficha de outro.

**Critérios de aceite**

- [ ] CA-2.1 Cada papel definido tem a lista de ações permitidas declarada em um só lugar
- [ ] CA-2.2 Uma ação fora do papel é recusada, e a recusa não revela a existência do dado
- [ ] CA-2.3 Existe teste de autorização por papel para cada caminho de escrita

**Regras de negócio que valem aqui**

- REG-42 a matriz de permissões do legado tinha **uma linha só** e zero controle (`permissions.md`)
- Decisão humana da Pergunta 8: os papéis são **leitura** e **escrita**. Os quatro papéis que o domínio sugeria, atendente, veterinário, gestor e dono, eram confiança vermelha e não existiam em disco: a resposta humana substituiu a suposição

> Três mecanismos do legado **não** são autorização e costumam ser confundidos com ela, e a
> análise os separou com cuidado: o bloqueio do identificador na ligação de dados, que é
> proteção contra atribuição em massa (ADR-0008); a interface de acesso a dados do catálogo de
> veterinários sem operação de escrita, que é leitura por construção (ADR-0005); e a marcação
> de transação como somente leitura. Nenhum dos três decide **quem** pode fazer o quê, e
> reaproveitá-los como se decidissem é o erro mais provável desta feature.
>
> CA-2.2 pede que a recusa **não distinga** dado existente de inexistente (`UT-034-2`). É a
> mesma disciplina de CA-1.2, aplicada a autorização em vez de autenticação: uma recusa que
> varia revela a base por tentativa e erro.

### US-3 (REQ-035) Atender pedido de exclusão ou anonimização de dado pessoal

Como clínica, quero poder apagar ou anonimizar os dados de um cliente que pediu a eliminação
para cumprir a obrigação legal sem precisar de acesso direto ao banco.

**Critérios de aceite**

- [ ] CA-3.1 É possível, por um caminho do próprio sistema, eliminar ou anonimizar os dados pessoais de um dono
- [ ] CA-3.2 Depois da operação, nenhum caminho de leitura do sistema devolve nome, endereço ou telefone daquela pessoa
- [ ] CA-3.3 O histórico clínico que precisa ser preservado continua existindo, desvinculado da identificação pessoal
- [ ] CA-3.4 A operação fica registrada com data e com quem a executou
- [ ] CA-3.5 Os textos livres ligados ao dono anonimizado são listados ao Administrador com os dados pessoais dele destacados; cada trecho confirmado vira `[removido]`, o resto do texto fica intacto, e o dono fica marcado como "revisão pendente" até a revisão terminar *(D25)*

**Regras de negócio que valem aqui**

- REG-41 nada é apagado: no legado não existia caminho de exclusão para dono, animal, visita, veterinário ou especialidade (`domain.md` §2.5, ADR-0007)
- REG-42 nenhuma entidade tinha autoria (`domain.md` §2.6)
- Decisão humana da Pergunta 7: **anonimização**, mais registro de que o registro foi alterado. Das três saídas possíveis, apagar, anonimizar ou arquivar, a escolha foi a do meio
- Princípio P2 da constituição: dado pessoal se anonimiza, nunca se apaga em silêncio

> A Pergunta 7 tinha duas partes e só a segunda foi respondida. A primeira, se havia rotina de
> exclusão **fora** do sistema, por comando direto no banco, planilha ou política de retenção,
> ficou sem resposta, e a análise não encontrou vestígio nenhum de procedimento manual. Isso
> não bloqueia nenhum critério, porque o sistema novo passa a ter o caminho de qualquer forma,
> mas muda o que se pode afirmar sobre o passado: não se sabe se dado de cliente já foi
> eliminado alguma vez.

### US-4 (REQ-036) Registrar autoria e data de cada alteração

Como clínica, quero saber quem alterou cada cadastro e quando para poder reconstruir o que
aconteceu quando um dado aparece errado.

**Critérios de aceite**

- [ ] CA-4.1 Toda gravação de dono, animal e visita registra quem a fez e em que momento
- [ ] CA-4.2 O registro de autoria é consultável por cadastro e não pode ser alterado pelos caminhos normais do sistema
- [ ] CA-4.3 Uma alteração feita sem identificação é impossível: não há caminho de escrita anônimo

**Regras de negócio que valem aqui**

- REG-42 nenhuma entidade tinha autoria, nenhuma tinha data de criação ou de alteração (`domain.md` §2.6)
- REG-43 não havia controle de concorrência otimista: o último a gravar vencia, em silêncio (`domain.md` §2.6)

> **Arbitrado em `memory/decisoes.md` D02: autoria por pessoa.** Texto original, mantido como histórico: A resposta da Pergunta 12
> foi **colunas de criação e de alteração, sem autoria**, e este card existe para registrar
> autoria. O conflito é exato e não é de interpretação: CA-4.1 pede "quem a fez e em que
> momento", e a decisão humana concedeu o momento e negou o quem. O agente não escolhe entre
> as duas, e as consequências de cada lado estão medidas: sem autoria, não se sabe quem
> inseriu o dado pessoal, e o próprio card registra que sem autoria nem log não resta rastro
> de qual alteração foi perdida numa edição concorrente, que é o problema de US-5 da
> feature 001. Com autoria, uma decisão humana explícita é revertida.
>
> Vale separar o que **não** está em conflito: CA-4.3, a inexistência de caminho de escrita
> anônimo, é compatível com as duas decisões, porque a Pergunta 8 criou papéis de leitura e de
> escrita, e escrita exige identidade. E as colunas de criação e de alteração já estão nos
> modelos de dados das features 001, 003 e 004, pela própria Pergunta 12. O que está em
> conflito é a coluna de **quem**.

## Fora de escopo

- **Registro de acesso a ficha de cliente.** A Pergunta 8 decidiu explicitamente **sem
  registro de acesso**, e nenhum card pede. É a decisão que mais barato sairia agora e mais
  caro sai depois, e fica registrada aqui por isso.
- **Proteger a superfície de gestão e monitoração.** É o card REQ-040, da feature 008, e lá
  está registrado o terceiro conflito entre decisão humana e card, o do item 6 do Não
  negociável da constituição.
- **O isolamento entre dados de clientes diferentes.** Decidido como requisito na Pergunta 23,
  está na feature 003, em US-5 dela. Não é autorização: é resolução de dado pelo dono, e a
  distinção importa porque no legado o isolamento era emergente e parecia garantia.
- **Política de retenção.** Quanto tempo o dado pessoal fica, e o que vence quando, não está em
  card algum. A Pergunta 12 deu a data de criação, que é o insumo que faltava, e nada mais.
- **Autenticação de sistema externo.** A rota de dados do catálogo de veterinários é da
  feature 005 e está bloqueada por não se saber se tem consumidor. Se tiver, ela precisa de
  identidade própria, e isso não tem card.
- **Papéis de negócio além de leitura e escrita.** A Pergunta 8 fixou dois. Atendente,
  veterinário, gestor e dono eram inferência da análise, confiança vermelha, e não entram.

## Perguntas em aberto

- [x] **A listagem completa da base de clientes fica aberta ou fechada?** É o conflito de US-1: a Pergunta 9 manda mantê-la acessível a qualquer requisitante, e CA-1.1 manda exigir identificação em todo caminho que lê dado pessoal. Sem arbitragem humana, a tarefa que entrega CA-1.1 tem de deixar um caminho de fora, e isso está dito em `tasks.md`. → ✅ **D04**: exige login
- [x] **A coluna de autoria existe ou não?** É o conflito de US-4: a Pergunta 12 decidiu sem autoria, e CA-4.1 e CA-4.2 a exigem. Dois critérios ficam sem tarefa enquanto isso durar. → ✅ **D02**: sim, por pessoa
- [x] **Qual é o tempo de inatividade que expira a sessão?** CA-1.3 é verificável contra qualquer valor configurado, e o valor não existe em card nem no legado, que não tinha sessão identificada. → ✅ **D19**: 8 horas
- [x] **O que, do histórico clínico, precisa ser preservado por obrigação legal?** CA-3.3 diz "o que precisa ser preservado" e nenhuma fonte deste processo define o conjunto. O teste `UT-035-2` fixa uma leitura operável, animais e visitas continuam existindo e nenhum deles permite voltar à identificação da pessoa, e é essa que as tarefas entregam. A pergunta é jurídica, não técnica, e a resposta pode exigir mais ou menos do que o teste. → ✅ **D24**: preserva todo o histórico (prazo do CFMV a confirmar)
- [x] **Houve eliminação de dado pessoal no passado, por fora do sistema?** Primeira metade da Pergunta 7, sem resposta. Não bloqueia critério, e muda o que se pode afirmar sobre a base. → ✅ moot: o legado nunca operou (Pergunta 13); não há base a migrar
- [x] **A anonimização alcança o dono apenas, ou também dado pessoal em campo livre?** A descrição da visita tem 255 caracteres de texto livre e nada impede que ela contenha nome ou telefone. CA-3.2 diz "nenhum caminho de leitura devolve nome, endereço ou telefone daquela pessoa", e o campo livre é o furo óbvio dessa frase. → ✅ **D25**: revisão pelo Administrador
- [x] **O dono é um ator do sistema?** A Pergunta 8 criou papéis de leitura e de escrita, e não disse se o cliente da clínica é um deles. A descrição de US-2 fala em "nenhum cliente veja a ficha de outro", o que pressupõe que seja, e o legado não tinha nenhum ator identificado. Se for, aparece uma relação entre identidade e dono que nenhum card modela. → ✅ **P-12**: não

## Rastreabilidade

| item | vem de |
|---|---|
| US-1 | REQ-033 · UC-01 a UC-07 · REG-42 · `WebConfiguration.java:32`, `pom.xml` · `permissions.md` · D-DET-09, LAC-UC-01 · Perguntas 8 e 9, em conflito |
| US-2 | REQ-034 · UC-02, UC-03, UC-05 a UC-07 · REG-42 · `OwnerController.java:60` · ADR-0005, ADR-0008 · Pergunta 8 |
| US-3 | REQ-035 · UC-02, UC-04 · REG-41, REG-42 · `db/h2/schema.sql` · ADR-0007 · LAC-UC-08, D-DET-04, D-DATA-6 · Pergunta 7 · princípio P2 |
| US-4 | REQ-036 · UC-02, UC-03, UC-05 a UC-07 · REG-42, REG-43 · `BaseEntity.java:30` · Pergunta 12, em conflito com o card |
