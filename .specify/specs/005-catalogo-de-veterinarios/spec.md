# Catálogo de veterinários

**Origem:** épico EP-5 do backlog do sistema legado (objetivo do épico: mostrar quem são os profissionais da clínica e em que são especializados)
**Cards:** REQ-023, REQ-024, REQ-025, REQ-026, REQ-027, REQ-028

## Por que esta feature existe

A clínica precisa mostrar quem são seus profissionais e em que cada um é especializado, para
dentro e para fora: a página é pública. No legado isso era a parte mais coesa e mais isolada
do sistema. O veterinário existia como **dado**, aparecia em dois casos de uso de leitura e
disparava zero fluxos; os grafos de chave estrangeira do domínio do dono e do domínio do
veterinário eram **disjuntos**, sem um único vínculo entre eles. É essa propriedade que torna
o catálogo extraível mexendo em 8 de 28 componentes, e é a mesma propriedade que impede o
sistema de responder "quais animais o Dr. Carter atendeu". A resposta da Pergunta 2 manteve o
catálogo como institucional, sem participação na operação.

A feature também carrega duas economias e uma correção. As economias são os dois cards
marcados como descarte no backlog, que estão aqui como **proibições verificáveis**, não como
coisas a construir: o campo de estado interno de persistência que vazava na resposta de
dados, e a segunda representação da mesma resposta, cuja existência nunca foi comprovada. A
correção é a contradição C4: a unicidade do par veterinário e especialidade existia em dois
dos três dialetos do legado e faltava justamente no padrão, e a aplicação **escondia** a
duplicata, porque a coleção de especialidades não comparava por valor. Era dado inconsistente
invisível pelo uso. A Pergunta 6 decidiu que a unicidade vale.

## Histórias de usuário

### US-1 (REQ-023) Consultar o catálogo de veterinários com suas especialidades

Como usuário do sistema, quero ver quem são os veterinários da clínica e em que cada um é
especializado para saber a quem encaminhar um atendimento.

**Critérios de aceite**

- [ ] CA-1.1 A lista apresenta nome, sobrenome e especialidades de cada veterinário
- [ ] CA-1.2 As especialidades de um veterinário aparecem em ordem alfabética
- [ ] CA-1.3 Veterinário sem especialidade alguma aparece na lista com indicação explícita de que não tem nenhuma
- [ ] CA-1.4 A consulta não altera nada na base

**Regras de negócio que valem aqui**

- REG-35 um veterinário exige nome e sobrenome, nada mais (`domain.md` §2.5)
- REG-36 um veterinário tem zero ou mais especialidades, e com zero a interface escreve a marca de ausência (`domain.md` §2.5)
- REG-37 as especialidades aparecem em ordem alfabética (`domain.md` §2.5)
- Decisão humana da Pergunta 2: o veterinário permanece como catálogo institucional, sem participação na operação

> No legado as validações de nome e sobrenome do veterinário **existiam e nunca eram
> exercitadas**, porque não havia formulário de veterinário em lugar algum. O teste
> `UT-023-5` exige que elas passem a ser exercitadas, o que é possível sem formulário: a
> validação é da entidade, não da tela.

### US-2 (REQ-024) Paginar o catálogo de veterinários com ordem estável

Como usuário do sistema, quero percorrer as páginas do catálogo com a certeza de ver cada
veterinário uma vez só para não achar que alguém sumiu do quadro.

**Critérios de aceite**

- [ ] CA-2.1 Percorrer todas as páginas do catálogo apresenta cada veterinário exatamente uma vez, sem repetição nem omissão
- [ ] CA-2.2 A ordenação é explícita e estável entre requisições: sobrenome, depois nome, ignorando caixa e acento *(P-07)*
- [ ] CA-2.3 Pedir uma página fora da faixa leva à primeira página do catálogo

**Regras de negócio que valem aqui**

- REG-40 no legado, cinco veterinários por página, com a mesma guarda de faixa da listagem de donos e **sem ordenação definida** (`domain.md` §2.5)

> CA-2.2 é correção, não preservação: sem ordenação explícita, duas requisições da mesma
> página podem devolver conjuntos diferentes, e é assim que alguém "desaparece" do quadro sem
> ter saído. A guarda de faixa de CA-2.3 é o conteúdo do **único commit** do repositório
> legado, e ela só termina por causa de um piso de uma página: remover esse piso numa
> simplificação cria laço infinito de redirecionamento com o catálogo vazio (`UT-024-3`).

### US-3 (REQ-025) Refletir no catálogo as alterações sem reiniciar a aplicação

Como usuário do sistema, quero que um veterinário recém-incluído apareça na lista
imediatamente para não precisar esperar uma reinicialização da aplicação.

**Critérios de aceite**

- [ ] CA-3.1 Incluir ou alterar um veterinário faz a alteração aparecer na consulta seguinte, sem reiniciar a aplicação
- [ ] CA-3.2 Existe teste que inclui um veterinário e verifica que ele aparece na requisição imediatamente posterior

**Regras de negócio que valem aqui**

- REG-38 o catálogo é somente leitura por construção (`domain.md` §2.5, ADR-0005)
- REG-39 no legado, o catálogo era guardado em memória **sem prazo de validade e sem invalidação** (`domain.md` §2.5, ADR-0005)

> As duas regras juntas explicam por que o defeito era invisível: como não havia caminho de
> escrita pela aplicação, a memória sem invalidação nunca ficava errada **pelo uso do
> sistema**. Ela ficava errada por alteração feita direto no banco, que era a única forma de
> mexer no quadro, e aí o catálogo mentia até a aplicação reiniciar. CA-3.1 pressupõe que o
> caminho de escrita passe a existir, e ele é o card REQ-046, da feature 009.

### US-4 (REQ-026) Disponibilizar o catálogo de veterinários como dados para outro sistema

> **Fora do escopo por `memory/decisoes.md` D22:** não há consumidor externo real, e a
> disponibilização para outro sistema sai. A API serve o catálogo só ao próprio front (D31). Os critérios abaixo ficam registrados e **não fazem parte do pronto**.
> US-5 e US-6 continuam valendo como proibições sobre qualquer resposta do sistema.

Como sistema externo, quero obter o catálogo de veterinários em formato de máquina para
consumi-lo sem raspar a tela.

**Critérios de aceite**

- [ ] CA-4.1 O catálogo é entregue em formato de dados, com os campos de negócio acordados com o consumidor
- [ ] CA-4.2 A resposta é paginada ou limitada, e o limite é verificável com base de volume maior que o da carga inicial
- [ ] CA-4.3 A resposta não contém campo algum que descreva estado interno de persistência

**Regras de negócio que valem aqui**

- REG-38 o catálogo é somente leitura por construção (`domain.md` §2.5, ADR-0005)

> **Card bloqueado no backlog, movido para pronto por uma pessoa.** O bloqueio é a lacuna
> LAC-UC-04: **nenhum cliente desta rota existe no repositório** e o ator consumidor é
> inferência, não fato. A pergunta precisa de resposta humana, não de mais leitura de código,
> e CA-4.1 depende dela por inteiro: "os campos de negócio acordados com o consumidor" exige
> que exista um consumidor com quem acordar. Se não houver, a rota é superfície pública sem
> dono e o contrato inteiro é economia.

### US-5 (REQ-027) Não expor o indicador interno de persistência no contrato público

Como responsável pelo contrato público do sistema, quero que nenhuma resposta de dados
carregue informação sobre o estado interno de persistência de uma entidade para não ter de
preservar para sempre um detalhe que não é de negócio.

**Critérios de aceite**

- [ ] CA-5.1 Nenhuma resposta de dados do sistema novo contém campo que descreva estado de persistência da entidade
- [ ] CA-5.2 O predicado equivalente, se existir, não é alcançável pela serialização

> **Card marcado como descarte no backlog.** Ele não pede nada construído: pede que algo do
> legado **não** seja reescrito, e os dois critérios são proibições verificáveis. No legado o
> campo aparecia na resposta de dados do catálogo só porque o predicado que diz se a entidade
> já passou pelo banco era público na superclasse comum a todas as entidades. Não é
> informação de negócio, não tinha consumidor conhecido e vazava o modelo de persistência
> para fora. O princípio P9 da constituição diz a mesma coisa em forma de princípio.

### US-6 (REQ-028) Entregar o catálogo em um único formato de dados

Como responsável pelo contrato público do sistema, quero que o catálogo tenha um formato de
dados só, com recusa explícita para qualquer outro, para não reescrever uma representação
que talvez nunca tenha funcionado.

**Critérios de aceite**

- [ ] CA-6.1 O sistema novo entrega o catálogo em um único formato de dados, JSON, consumido pelo próprio front *(D22, D31)*
- [ ] CA-6.2 Um pedido de outro formato recebe recusa explícita, e não uma resposta malformada

> **Card marcado como descarte no backlog.** A razão está na lacuna G1 e em LAC-UC-03: **só a
> resposta em um dos dois formatos tem prova**, num teste, e nenhuma biblioteca de
> serialização do segundo formato está declarada em nenhum dos dois arquivos de build do
> legado. A anotação que sugeria a segunda representação é resíduo, e é provável que ela nunca
> tenha funcionado. Se um consumidor aparecer, a decisão se revê junto com US-4, e isso está
> dito no card.

## Fora de escopo

- **Criar e desligar veterinário.** A situação de vínculo, decidida nas Perguntas 4 e 17, tem
  critério de aceite em **um** card, e ele não é desta feature: é CA-2.4 de REQ-046, na
  feature 009, que manda o desligado sair do catálogo sem que o histórico que o menciona seja
  perdido. O que esta feature precisa fazer é **respeitar** essa situação ao montar o catálogo
  de tela e a resposta de dados, e isso é consequência de uma decisão tomada lá. O que continua
  sem critério em card algum é o **conjunto** de situações e as transições entre elas, e isso
  está em Perguntas em aberto.
- **Manter o quadro de veterinários e as especialidades.** Criar, alterar e vincular é o card
  REQ-046, da feature 009. Esta feature **lê** o catálogo, e US-3 exige que a leitura reflita
  a escrita de lá.
- **O veterinário na operação.** Registrar quem atendeu uma visita é a feature 004, em US-4
  dela, e lá está registrado o conflito entre a Pergunta 2 e os critérios daquele card. Esta
  feature segue a Pergunta 2: o catálogo é institucional.
- **Campos novos do veterinário.** Conselho profissional, registro, agenda, contato e horário
  de atendimento não existem em card algum. A Pergunta 17 só decidiu a situação de vínculo.
- **Quem pode ver o catálogo.** É a feature 007. A página era pública no legado e esta feature
  não muda isso por conta própria.
- **A especialidade como entidade com atributos.** A Pergunta 17 registra que, se a
  especialidade precisar de data, nível ou situação, a tabela de junção tem de virar entidade,
  o que é mudança estrutural. Nenhum card pede isso.

## Perguntas em aberto

- [x] **Existe consumidor real da rota de dados do catálogo?** Bloqueia CA-4.1 por inteiro, porque "os campos acordados com o consumidor" não existem sem consumidor. Lacuna LAC-UC-04. O card foi movido para pronto por uma pessoa com esta pergunta ainda aberta, e a resposta decide entre preservar um contrato e descartar uma superfície pública sem dono. → ✅ **D22**: não; a rota sai
- [x] **A situação de vínculo do veterinário tem quais valores, e quais transições?** Decidida nas Perguntas 4 e 17, com um único critério de aceite em card, CA-2.4 da feature 009 (card REQ-046), que trata apenas do desligamento. O conjunto de valores não está em lugar algum, e três consequências desta feature dependem dele: um veterinário com vínculo encerrado continua contando na paginação de CA-2.1? Continua aparecendo na resposta de dados de US-4? Pode ser reativado? As três mudam critérios que já existem aqui. → ✅ **P-09**: Ativo e Desligado, com reativação
- [x] **Qual é o prazo de validade da memória do catálogo?** O teste `UT-025-4` exige que, no limite do prazo configurado, a memória ainda valha, e no instante seguinte a leitura vá à fonte. O valor do prazo não existe em card, em regra nem no legado, que guardava sem prazo nenhum. Sem ele, metade do teste não tem número. → ✅ **P-08**: invalidação por escrita e TTL de 10 min
- [x] **A paginação da página pública e o limite da resposta de dados são o mesmo número?** CA-2.1 fala de páginas de cinco, herdado de REG-40, e CA-4.2 fala de um limite verificável com volume maior que o da carga inicial. São dois recortes com dois propósitos, e nada diz se eles se acompanham. → ✅ moot: a resposta de dados saiu (D22); a paginação segue P-06
- [x] **A ordenação explícita de CA-2.2 é por qual critério?** Sobrenome e nome é o que a tela sugere, e o legado não tinha ordenação definida em lugar nenhum. O critério exige que seja explícita e estável, não diz qual, e a escolha é observável por quem usa a página. → ✅ **P-07**: sobrenome, nome

## Rastreabilidade

| item | vem de |
|---|---|
| US-1 | REQ-023 · UC-08 · REG-35, REG-36, REG-37 · `VetController.java:56`, `Vet.java:60`, `vetList.html:17` · Pergunta 2 |
| US-2 | REQ-024 · UC-08 · REG-40 · `VetController.java:65` · commit 500158f do legado |
| US-3 | REQ-025 · UC-08, UC-09 · REG-38, REG-39 · `VetRepository.java:45`, `CacheConfiguration.java:37` · ADR-0005 |
| US-4 | REQ-026 · UC-09 · REG-38 · `VetController.java:72`, `Vets.java:30` · LAC-UC-04, bloqueio registrado |
| US-5 | REQ-027 · UC-09 · `BaseEntity.java:35` · princípio P9 da constituição · card de descarte |
| US-6 | REQ-028 · UC-09 · `Vets.java:30` · lacuna G1, LAC-UC-03 · card de descarte |
