# Vocabulários do domínio

**Origem:** épico EP-9 do backlog do sistema legado (objetivo do épico: manter espécies, veterinários e especialidades sem depender de acesso ao banco)
**Cards:** REQ-045, REQ-046

## Por que esta feature existe

O legado tinha três vocabulários de domínio, espécies de animal, veterinários e
especialidades, e **nenhuma tela para mantê-los**. O vocabulário de espécies era controlado
por dados e não por código, de modo que trocar a carga inicial trocava as opções do
formulário, e nada em código conhecia os seis valores. Isso é bom desenho e virou armadilha:
para acrescentar uma espécie quando aparecia um paciente de espécie nova, alguém precisava de
**acesso direto ao banco de dados**. O mesmo valia para o quadro de veterinários, e com um
agravante: como o catálogo era guardado em memória sem invalidação, uma alteração feita por
fora **não aparecia** até a aplicação reiniciar. A análise registrou isso como caso de uso
faltante, LAC-UC-10.

A feature resolve duas coisas de passagem, e as duas estão em cards de outras features. A
primeira é a contradição C4: a restrição que impede o par veterinário e especialidade repetido
existia em dois dos três dialetos do legado e faltava justamente no padrão, onde a estrutura
de dados **absorvia a duplicata na leitura** e o dado ficava inconsistente em silêncio. A
segunda é a situação de vínculo do veterinário, que a página pública anunciava mesmo depois de
a pessoa sair da clínica.

Os dois cards estavam em backlog e foram movidos para pronto no kanban. O motivo do bloqueio é
o mesmo nos dois, e está escrito nos cards: **manutenção de vocabulário é ação administrativa
e, sem identificação, ficaria aberta a qualquer um**.

## Histórias de usuário

### US-1 (REQ-045) Manter o vocabulário de espécies pelo próprio sistema

Como clínica, quero incluir e renomear espécies de animal pelo próprio sistema para não
depender de acesso ao banco de dados quando aparece um paciente de espécie nova.

**Critérios de aceite**

- [ ] CA-1.1 É possível incluir uma espécie e ela fica imediatamente disponível para escolha no cadastro de animal
- [ ] CA-1.2 É possível renomear uma espécie, e os animais já cadastrados continuam vinculados a ela
- [ ] CA-1.3 Uma espécie em uso não pode ser removida; a tentativa é recusada com explicação
- [ ] CA-1.4 A escolha da espécie no formulário não depende de o usuário digitar o nome com a grafia exata

**Regras de negócio que valem aqui**

- REG-23 no legado, a espécie vinha de um vocabulário fechado de seis valores, **que só mudava por comando no banco** (`domain.md` §2.3)
- REG-24 a espécie trafega pelo nome, com comparação sensível à caixa no legado (`domain.md` §2.3, ADR-0009)
- REG-41 nada é apagado (`domain.md` §2.5, ADR-0007)

> CA-1.2 só é verdade por causa de uma decisão de modelo que o legado já tinha: o animal
> aponta para a espécie por **identificador**, e o nome é a chave funcional apenas no
> formulário. Renomear não desvincula ninguém. O que renomear faz é **mudar o valor que o
> formulário envia**, e é por isso que a feature 003 precisa saber que esta tela existe.
>
> `UT-045-7` acrescenta uma operação que nenhum critério nomeia: **retirar a espécie do uso**
> sem apagá-la, de modo que ela saia das opções e continue existindo para o histórico. É a
> leitura de REG-41 aplicada a vocabulário, e está registrada em Perguntas em aberto porque o
> conjunto de situações de uma espécie não está definido em lugar algum.

### US-2 (REQ-046) Manter o quadro de veterinários e suas especialidades

Como clínica, quero incluir, alterar e desligar veterinários e ajustar as especialidades de
cada um pelo próprio sistema para que o catálogo acompanhe o quadro real.

**Critérios de aceite**

- [ ] CA-2.1 É possível incluir um veterinário com nome e sobrenome e atribuir-lhe nenhuma, uma ou várias especialidades
- [ ] CA-2.2 É possível alterar as especialidades de um veterinário já cadastrado
- [ ] CA-2.3 O mesmo par veterinário e especialidade não pode ser atribuído duas vezes, em nenhum banco homologado
- [ ] CA-2.4 Um veterinário desligado deixa de aparecer no catálogo sem que o histórico que o menciona seja perdido
- [ ] CA-2.5 A alteração aparece no catálogo na consulta seguinte, sem reiniciar a aplicação

**Regras de negócio que valem aqui**

- REG-35 um veterinário exige nome e sobrenome, nada mais (`domain.md` §2.5)
- REG-36 um veterinário tem zero ou mais especialidades (`domain.md` §2.5)
- REG-38 no legado, o catálogo era somente leitura **por construção** (`domain.md` §2.5, ADR-0005)
- REG-41 nada é apagado (`domain.md` §2.5, ADR-0007)
- Decisão humana da Pergunta 6: a unicidade do par veterinário e especialidade vale, e o dialeto padrão passa a ter a restrição que lhe faltava
- Decisões humanas das Perguntas 4 e 17: o veterinário ganha situação de vínculo

> **Esta história desfaz, de propósito, um desenho que o legado tinha por construção.** REG-38
> e o ADR-0005 registram que a impossibilidade de escrever no catálogo era **estrutural**: a
> interface de acesso a dados não herdava operação de escrita nenhuma. O card não ignora isso,
> ele troca o mecanismo de garantia: a superfície de **leitura** continua sem operação de
> escrita, verificada por `UT-025-3` da feature 005, e a escrita passa a existir numa
> superfície própria, administrativa. Perder essa distinção, e abrir escrita na mesma interface
> que a tela pública usa, é o erro mais fácil desta feature.
>
> **CA-2.4 depende de um conflito que não é desta feature.** "O histórico que o menciona" só
> existe se a visita registrar quem atendeu, e isso é CA-4.2 da feature 004, onde está
> registrado o conflito entre a resposta da Pergunta 2, que mantém o veterinário fora da
> operação, e os critérios daquele card. Enquanto o conflito durar, **nada no sistema menciona
> um veterinário**, a segunda metade de CA-2.4 fica sem sujeito e o teste `UT-046-4` não tem
> como ser montado. A primeira metade, o desligado saindo do catálogo com a linha preservada,
> é entregue.

## Fora de escopo

- **Autenticar e autorizar quem mantém os vocabulários.** É a feature 007, e é o motivo pelo
  qual os dois cards estavam bloqueados. A resposta da Pergunta 8 resolveu metade: existem dois
  papéis, leitura e escrita, e manutenção de vocabulário é escrita. Se a clínica quiser um
  terceiro papel administrativo, isso não está em card algum, e está em Perguntas em aberto.
- **Ler o catálogo de veterinários.** É a feature 005. Esta feature **escreve** no que ela lê, e
  CA-2.5 é o par de CA-3.1 de lá: as duas descrevem a mesma invalidação de memória, de lados
  opostos.
- **Usar a espécie no cadastro de animal.** É a feature 003, que **consome** o vocabulário e
  exige que ele seja fechado no momento da gravação. A carga inicial dos seis valores é de lá;
  a manutenção posterior é daqui.
- **Registrar quem atendeu uma visita.** É a feature 004, e é o conflito do qual CA-2.4 depende.
- **Manter o vocabulário de especialidades por si.** Os dois cards tratam de espécie e de
  veterinário. A especialidade aparece como o que se **atribui** a um veterinário, e nenhum
  critério fala de criar, renomear ou retirar especialidade. No legado ela não tinha repositório
  próprio e só era alcançável navegando por um veterinário.
- **Campos novos do veterinário.** Conselho profissional, registro, agenda e contato não estão
  em card algum.

## Perguntas em aberto

- [x] **Quais são as situações de uma espécie e de um veterinário, e quais transições valem?** CA-2.4 usa "desligado" e `UT-045-7` usa "retirada do uso", e nenhum dos dois conjuntos está definido. As Perguntas 4 e 17 decidiram que a situação existe para o veterinário e a Pergunta 16 para o animal; nada foi decidido para a espécie, e o card a pressupõe. A pergunta é compartilhada com as features 003, 004 e 005. → ✅ **P-09** e **P-10**
- [x] **Existe um papel administrativo, além de leitura e escrita?** A Pergunta 8 fixou dois papéis. Manutenção de vocabulário é ação administrativa, e tratá-la como escrita comum significa que quem cadastra um dono também renomeia espécies e desliga veterinários. Pode ser exatamente o que a clínica quer, numa operação pequena, e precisa estar dito em vez de suposto. → ✅ **D18**: sim
- [x] **Quais são os bancos homologados?** CA-2.3 exige que a recusa do par repetido valha "em nenhum banco homologado", e a lista não existe: o princípio P5 da constituição manda eleger um único dialeto e a decisão não foi tomada. É a mesma pendência de CA-2.4 da feature 003. → ✅ **P-05**: só PostgreSQL
- [x] **Um veterinário desligado pode ser reativado?** CA-2.4 o retira do catálogo e `UT-046-8` preserva a linha. Nada diz se ele volta, e a resposta muda se a situação é um valor ou um histórico de situações, como `UT-021-1` da feature 004 exige para a visita. → ✅ **P-09**: sim, pelo Administrador
- [x] **Renomear uma espécie muda o valor que o formulário envia. Isso quebra algum consumidor?** A rota de dados do catálogo de veterinários é o único contrato de máquina do sistema, e não trafega espécie, então a resposta provável é não. Mas o ADR-0009 registra que a espécie trafega pelo nome, e se um dia houver integração que a consuma, renomear é alteração de contrato público, item 2 do Não negociável da constituição. → ✅ **P-10**: o formulário envia o identificador; renomear não quebra
- [x] **A especialidade é criada por quem?** Nenhum critério fala disso, e CA-2.1 pressupõe "um catálogo de especialidades conhecido". No legado as três da carga inicial eram tudo o que existia, e não havia caminho para criar a quarta. → ✅ **P-11**: Administrador

## Rastreabilidade

| item | vem de |
|---|---|
| US-1 | REQ-045 · UC-05, UC-06 · REG-23, REG-24, REG-41 · `PetTypeRepository.java:37`, `PetTypeFormatter.java:51` · ADR-0009, ADR-0007 · LAC-UC-10 |
| US-2 | REQ-046 · UC-08 · REG-35, REG-36, REG-38, REG-41 · `VetRepository.java:38`, `db/h2/schema.sql` · ADR-0005, ADR-0007 · contradição C4 · Perguntas 4, 6 e 17 |
