# Constituição do projeto

> Sistema de origem: **spring-petclinic** (clínica veterinária, monólito web renderizado no servidor).
> Pacote gerado em 2026-10-06 a partir da engenharia reversa em `_reversa_sdd/`.
> Fontes desta constituição: `soul.md` (decisões fundadoras D1 a D7 e lacunas L1 a L6),
> `domain.md` (48 regras REG-01 a REG-48, contradições C1 a C5), `permissions.md`
> (matriz de uma única linha) e as 26 respostas humanas de `questions.md`.

> **Leia junto:** `memory/decisoes.md`, com as decisões humanas de 2026-10-07 (D01 a D29),
> os padrões propostos (P-01 a P-17) e as pendências refinadas (D24 a D29). Onde aquele
> arquivo diverge de uma resposta de `questions.md` citada abaixo, ele prevalece.

Estes princípios valem para **todo** o projeto novo. O agente de codificação relê este
arquivo antes de cada tarefa e nenhuma implementação pode violá-los. Onde um princípio
colide com a conveniência de uma tarefa, o princípio vence e a tarefa muda.

Cada princípio tem três partes: a regra, **por que** ela existe (o que o sistema legado fez
e custou) e **como conferir** que uma mudança não a violou.

## P1. O dono é a única porta de entrada para animal e visita

**Regra:** nenhum acesso a animal ou a visita acontece sem passar pelo dono a que eles
pertencem. Não existe consulta de animal por identificador solto, nem de visita por
identificador solto, em nenhuma camada.

**Por que:** no legado o isolamento entre clientes existia, mas por acidente de estrutura:
todo acesso passava por `owner.getPet(petId)`, que varre apenas a coleção daquele dono, e
não havia repositório de animal nem de visita. Nenhuma linha dizia que isso era
intencional e nenhum teste verificava. Trocar aquela chamada por uma busca direta por
identificador removeria o isolamento e a suíte inteira continuaria verde. A resposta da
Pergunta 23 transformou o acidente em requisito: o isolamento entre clientes é requisito e
deve ser verificado.

**Como conferir:** existe um teste que pede um animal de um dono usando o identificador de
outro dono e espera recusa, e ele falha se a busca por identificador solto for
reintroduzida. O teste é escrito **antes** da implementação do acesso.

## P2. Dado pessoal se anonimiza, nunca se apaga em silêncio

**Regra:** toda entidade que guarda dado pessoal tem caminho de anonimização acessível pela
aplicação, e toda alteração de registro deixa registro de que foi alterada, com data de
criação e data de alteração.

**Por que:** o legado não tinha nenhum caminho de exclusão, nem endpoint, nem chamada de
repositório, nem remoção de órfãos, nem exclusão lógica, e as quatro chaves estrangeiras
não declaravam comportamento ao apagar (REG-41). Guardava nome, endereço e telefone de
pessoa física sem data de criação e sem autoria (REG-42), o que torna impossível saber o
que estaria vencido numa política de retenção. É o único ponto da análise com consequência
legal: o direito de eliminação do art. 18 da LGPD não tinha onde se encaixar no modelo.
As respostas das Perguntas 7 e 12 fixaram o desenho: anonimização mais registro de que o
registro foi alterado, com colunas de criação e de alteração, sem autoria.

**Como conferir:** para cada tabela que guarda dado pessoal existe um teste que anonimiza
um registro e verifica que o dado identificável saiu, que o histórico vinculado continuou
existindo e que a data de alteração mudou. Uma tabela nova de dado pessoal sem esse teste
reprova a revisão.

## P3. Nome de coluna e limite de tamanho são declarados, nunca derivados

**Regra:** toda coluna tem o nome declarado explicitamente no mapeamento, e todo limite de
tamanho existe nos dois lados, na validação da aplicação e no esquema do banco, com o mesmo
número.

**Por que:** no legado, 18 das 24 colunas tinham o nome derivado de **uma única linha** de
configuração (`application.properties:12`) e nenhuma entidade declarava o nome da coluna,
com a única exceção de `visit_date`. Nenhum teste comparava o nome gerado com o nome do
DDL. Esse é o maior risco de migração do projeto porque o erro é silencioso, total e
tardio: o build passa, os testes de unidade passam e o esquema real não casa. No mesmo
ponto está a contradição C3, em que nome de 30 caracteres era limite na aplicação, limite
no banco em dois dialetos e nenhum limite no terceiro. A resposta da Pergunta 14 decidiu
declarar o nome de todas as colunas em anotação, tornando a estratégia derivada inócua.

**Como conferir:** existe um teste que compara, coluna por coluna, o nome declarado no
mapeamento com o nome presente na migração de esquema, e ele falha se alguma coluna
depender de derivação automática. Um segundo teste alimenta cada campo com o tamanho máximo
e com o tamanho máximo mais um, e espera aceite e recusa.

## P4. A chave primária é inteiro gerado pelo banco, e "novo" significa "sem identificador"

**Regra:** nenhuma entidade atribui identificador a si mesma. O identificador nasce no
banco, e o predicado "ainda não foi persistido" é exatamente "identificador ausente".

**Por que:** no legado esse predicado de três linhas tinha nove consumidores, três deles em
expressões de template que nenhum compilador verifica, e governava seis comportamentos: a
obrigatoriedade da espécie na criação, a verificação preventiva de nome de animal
duplicado, a busca de animal dentro do agregado, o rótulo de todo botão de formulário e o
filtro do histórico de visitas. Um identificador atribuído pela aplicação faria o predicado
devolver sempre falso e inverteria os seis **sem nenhuma falha de compilação e sem nenhum
teste vermelho**. O caso mais grave não é ruidoso: a verificação preventiva de nome
duplicado simplesmente deixa de rodar, e a regra mais defendida do sistema cai de três
camadas para uma. A resposta da Pergunta 20 manteve o inteiro gerado pelo banco.

**Como conferir:** cada um dos comportamentos que dependem de "novo" tem um teste próprio
que nomeia essa dependência. Uma busca por `UUID` ou por geração de identificador em
construtor, em qualquer entidade, reprova a revisão.

## P5. Um dialeto de banco é a verdade, e o esquema só muda por migração versionada

**Regra:** existe um único dialeto de banco eleito. Toda mudança de esquema é uma migração
versionada, aplicada na ordem, e nenhum arquivo de criação de esquema é mantido à mão em
paralelo.

**Por que:** o legado mantinha três arquivos de esquema paralelos, um por dialeto, sem
nenhuma ferramenta de migração, e o esquema era recriado a cada inicialização (D5). Quatro
comportamentos observáveis mudavam com o perfil escolhido: busca por sobrenome ignorando
caixa, mensagem de nome de animal duplicado, limite de tamanho de nome e unicidade do par
veterinário e especialidade. Não existia "o comportamento do legado", existiam três, e
quatro das cinco contradições de camada nasciam dessa divergência. A resposta da Pergunta 13
desarmou a arqueologia mas não a decisão: o sistema nunca operou de verdade, logo não há
perfil de produção a imitar, e o projeto novo precisa eleger um.

**Como conferir:** o repositório tem um diretório de migrações numerado e nenhum arquivo de
criação de esquema fora dele. Uma mudança de modelo sem migração correspondente no mesmo
commit reprova a revisão.

## P6. Nenhuma regra fica de pé numa só camada quando outra camada a contradiz

**Regra:** cada regra de negócio tem um lugar onde é aplicada e um teste que a percorre da
entrada até o banco. Onde duas camadas aplicam a mesma regra, elas aplicam o **mesmo**
limite, e o teste prova isso.

**Por que:** a análise encontrou cinco contradições de camada no legado, duas de gravidade
alta. Em C1 a espécie do animal era obrigatória só na criação pela aplicação e sempre pelo
banco, e uma requisição de edição sem espécie gravava nulo e terminava em erro 500 sem
mensagem de campo. Em C2 a mensagem de nome duplicado era decidida procurando o nome de uma
restrição dentro do texto de uma exceção, e num dos dialetos a restrição era anônima, de
modo que o usuário via erro 500. Nos dois casos havia duas intenções legítimas e nenhum
árbitro. As respostas das Perguntas 5 e 6 arbitraram as duas: a espécie é obrigatória
sempre, inclusive na edição, e a unicidade do par veterinário e especialidade vale.

**Como conferir:** para cada regra listada nas specs existe um teste que entra pela mesma
porta que o usuário usa e chega até o banco. Tratamento de erro que decide mensagem lendo
texto de exceção reprova a revisão.

## P7. Nenhum texto visível ao usuário nasce literal no código

**Regra:** toda mensagem, rótulo, título e texto de erro vem do catálogo de tradução. O
catálogo é completo em todos os idiomas suportados, e isso é verificado por teste.

**Por que:** o legado tinha interface traduzida em **10 idiomas, em 11 arquivos de
catálogo**, com a completude verificada por teste (REG-44), e ao mesmo tempo as seis
mensagens de confirmação de gravação estavam em inglês literal dentro do código, fora do
catálogo. A tradução se rompia exatamente onde o usuário mais olha. No mesmo catálogo
sobreviviam três chaves fósseis traduzidas sem nenhum consumidor, e duas chaves usadas pelo
código que não existiam em nenhum arquivo, caindo no texto literal em inglês.

> A contagem acima está corrigida pela resposta da Pergunta 25, e boa parte dos artefatos
> deste processo ainda diz "11 idiomas". São 11 arquivos e 10 idiomas: o arquivo de inglês
> tem zero chave e existe apenas para que o pedido daquele idioma resolva por recurso ao
> catálogo padrão. A decisão humana foi manter o arquivo vazio e corrigir a contagem, e a
> feature 006 trata disso.

**Como conferir:** o teste de sincronia dos catálogos cobre todas as chaves em todos os
idiomas e falha com chave faltante **ou** chave sem consumidor. Uma segunda verificação
procura texto visível literal nas respostas e nas páginas e reprova se encontrar.

## P8. Um único comando significa verde, e só se entrega verde

**Regra:** existe um comando no repositório que roda build, análise estática e testes, e
devolve um só veredito. Cobertura é reportada por esse comando. Nada é entregue com ele
vermelho.

**Por que:** o legado mantinha dois sistemas de build em paralelo, nenhum eleito como
verdade, com conjuntos de dependências divergentes e dois fluxos de integração contínua
(D6). A divergência já era observável: a geração do CSS e a medição de cobertura existiam
só em um dos dois, e por isso o CSS compilado estava versionado no repositório. Nenhum
número de cobertura podia ser citado sobre os 20 arquivos de teste existentes. Nenhuma das
três propostas de arquitetura levantadas pela análise dispensa esse pré-requisito.

**Como conferir:** o comando existe, está documentado no README do projeto e é o mesmo que
a integração contínua executa. Dois caminhos de build divergentes reprovam a revisão.

## P9. O que o sistema expõe é contrato, e contrato se escreve antes de existir

**Regra:** rota, nome de campo de formulário, envelope de resposta e código de status são
contrato declarado em arquivo. Nenhum detalhe interno de persistência aparece numa resposta
pública.

**Por que:** no legado os nomes de campo do contrato HTTP não estavam nos controllers,
estavam nos parâmetros dos fragmentos de template, de modo que renomear um parâmetro de
fragmento mudava o contrato HTTP sem tocar em um único arquivo de código. O endpoint de
dados do catálogo de veterinários devolvia um campo que é estado interno de persistência,
porque o predicado "ainda não persistido" era público. E dono ou animal inexistente na URL
produzia erro 500 em vez de "não encontrado", porque não havia nenhum tratador de exceção
no projeto (REG-48). Nada disso estava escrito em lugar algum.

**Como conferir:** cada rota tem um teste de contrato que fixa nome de campo de entrada,
forma da resposta e código de status. Um campo de resposta que exista por detalhe de
persistência reprova a revisão.

## Não negociável

O agente de codificação **para e pergunta** antes de qualquer uma destas ações. Nenhuma
delas é tarefa de implementação, todas exigem decisão humana registrada:

1. **Mudar, afrouxar ou criar regra de negócio** que não esteja escrita numa spec deste
   pacote. Regra que falta vira pergunta em aberto, nunca invenção.
2. **Alterar contrato público**: rota, nome de campo de formulário, envelope de resposta ou
   código de status já publicado.
3. **Apagar dado**, de qualquer entidade, por qualquer caminho. O princípio P2 autoriza
   anonimizar, não excluir.
4. **Trocar a stack decidida.** A decisão existe: `.specify/arquitetura/decision.json`,
   confirmada e ajustada em `memory/decisoes.md` D20 e D30 a D35 (Portas e adaptadores;
   NestJS como única porta de domínio; Next.js com shadcn/ui na apresentação; contrato em
   zod gerando OpenAPI; PostgreSQL, Prisma, Redis, RabbitMQ; Kubernetes agnóstico de provedor, D36). Usar o que está lá não exige pergunta;
   **trocar qualquer peça** exige.
5. **Trocar o dialeto de banco eleito.** P5 está satisfeito por D20: PostgreSQL é o único
   dialeto. Introduzir outro exige decisão humana.
6. **Abrir a superfície de gestão e monitoração.** O conflito entre a Pergunta 10 e o
   REQ-040 foi arbitrado em `memory/decisoes.md` D03: só as sondas ficam abertas, e o resto
   exige o papel Administrador. Abrir qualquer caminho além das sondas exige decisão humana.
7. **Trocar o tipo da chave primária** ou passar a atribuí-la na aplicação, pelos motivos
   de P4.
8. **Mexer em credencial.** O legado trazia credencial em texto puro em cinco locais
   comitados. Nenhum valor desses foi copiado para este pacote e nenhum deve ser recriado
   em arquivo do projeto novo.
