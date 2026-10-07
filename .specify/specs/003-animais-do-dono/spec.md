# Animais do dono

**Origem:** épico EP-3 do backlog do sistema legado (objetivo do épico: manter os pacientes da clínica vinculados a quem responde por eles)
**Cards:** REQ-013, REQ-014, REQ-015, REQ-016, REQ-017

## Por que esta feature existe

O animal é o paciente da clínica, e no legado ele não tinha existência própria: não havia
repositório de animal, e todo acesso passava pela coleção do dono. Essa dependência não era
burocracia, era o que mantinha os dados de um cliente separados dos de outro. A feature
existe para que o paciente continue pendurado em quem responde por ele, agora de propósito
e com teste, e para que a clínica saiba qual Rex é qual na hora do atendimento.

É também a feature onde moram as duas regras mais defendidas e a contradição mais grave do
sistema velho. A unicidade de nome de animal por dono era a única regra com defesa em três
camadas, e nasceu de um defeito real de condição de corrida corrigido de propósito. A
contradição é o inverso: a espécie do animal era obrigatória só na criação pela aplicação e
sempre pelo banco, de modo que uma requisição de edição sem espécie gravava nulo, o banco
recusava, a exceção não era reconhecida e o usuário recebia uma falha de sistema sem
mensagem de campo. As duas estão escritas aqui como histórias com critério verificável.

## Histórias de usuário

### US-1 (REQ-013) Cadastrar animal do dono

Como usuário do sistema, quero acrescentar um animal à ficha de um dono, com nome, data de
nascimento e espécie, para que o paciente exista no sistema.

**Critérios de aceite**

- [ ] CA-1.1 Com nome, data de nascimento e espécie preenchidos, o animal é gravado vinculado àquele dono e o usuário termina na ficha do dono
- [ ] CA-1.2 Nome em branco, com mais de 30 caracteres, data de nascimento vazia ou espécie não escolhida devolvem o formulário com o campo marcado e mensagem traduzida, e nada é gravado
- [ ] CA-1.3 Data de nascimento futura é recusada com erro no campo de data
- [ ] CA-1.4 A espécie é escolhida de um vocabulário fechado e o sistema não aceita valor fora dele
- [ ] CA-1.5 O animal gravado tem exatamente um dono e exatamente uma espécie

**Regras de negócio que valem aqui**

- REG-15 nome, data de nascimento e espécie são obrigatórios (`domain.md` §2.3)
- REG-16 o nome do animal tem no máximo trinta caracteres (`domain.md` §2.3)
- REG-17 a data de nascimento não pode ser futura (`domain.md` §2.3)
- REG-20 um animal pertence a exatamente um dono e tem exatamente uma espécie (`domain.md` §2.3)
- REG-23 a espécie vem de um vocabulário fechado de seis valores (`domain.md` §2.3)
- REG-24 a espécie trafega pelo nome, com comparação sensível à caixa no legado (`domain.md` §2.3, ADR-0009)
- REG-25 espécie inexistente no formulário vira erro no campo de espécie (`domain.md` §2.3)
- REG-26 a data de nascimento usa o formato aaaa-mm-dd, sem localização (`domain.md` §2.3)

> REG-24 descreve o legado, não o alvo. O card pede, no teste `UT-013-7`, que a espécie
> escrita com outra caixa de letra resolva para o mesmo valor do vocabulário em vez de virar
> erro de espécie inexistente. CA-1.4 vale com essa leitura: o vocabulário é fechado, e a
> comparação com ele ignora a caixa.

### US-2 (REQ-014) Garantir nome de animal único por dono, inclusive sob concorrência

Como usuário do sistema, quero ser impedido de dar a dois animais do mesmo dono o mesmo
nome para não confundir qual paciente é qual na hora do atendimento.

**Critérios de aceite**

- [ ] CA-2.1 Cadastrar para o mesmo dono um segundo animal com nome igual, ignorando maiúsculas e minúsculas, é recusado com mensagem traduzida no campo nome
- [ ] CA-2.2 Dois donos diferentes podem ter animais com o mesmo nome, sem alarme
- [ ] CA-2.3 Dois cadastros simultâneos do mesmo nome para o mesmo dono: exatamente um sobrevive e o outro recebe a mensagem de nome já em uso, nunca erro genérico de sistema
- [ ] CA-2.4 O comportamento da recusa concorrente é idêntico em todos os bancos homologados, verificado por teste de concorrência
- [ ] CA-2.5 Editar um animal mantendo o nome dele próprio é aceito

**Regras de negócio que valem aqui**

- REG-18 um dono não pode ter dois animais com o mesmo nome, ignorando a caixa (`domain.md` §2.3)
- REG-19 a unicidade vale por dono, não globalmente (`domain.md` §2.3)
- ADR-0001 do legado: a regra tinha defesa em três camadas, verificação preventiva, restrição de banco e tradução da exceção, e nasceu de um defeito real de condição de corrida corrigido de propósito
- Contradição C2 de `domain.md` §3, de gravidade alta: o reconhecimento da violação procurava o nome da restrição dentro do texto da exceção, e num dos dialetos a restrição era anônima, de modo que o usuário recebia falha de sistema. CA-2.3 e CA-2.4 arbitram: o reconhecimento é pelo tipo do erro, nunca pelo texto

### US-3 (REQ-015) Alterar os dados do animal sem tocar no histórico de visitas

Como usuário do sistema, quero corrigir nome, data de nascimento ou espécie de um animal já
cadastrado para manter a ficha certa sem perder o que já foi atendido.

**Critérios de aceite**

- [ ] CA-3.1 O formulário de edição abre preenchido com os dados atuais do animal
- [ ] CA-3.2 Confirmada a alteração, o animal passa a ter os dados novos mantendo o mesmo identificador, e o usuário termina na ficha do dono
- [ ] CA-3.3 As visitas do animal permanecem exatamente as mesmas, em número e conteúdo, antes e depois da edição
- [ ] CA-3.4 As validações de nome, tamanho e data de nascimento são as mesmas do cadastro
- [ ] CA-3.5 O animal tem situação Ativo, Falecido ou Transferido; nasce Ativo; a edição permite Ativo → Falecido e Ativo → Transferido, e só o Administrador volta para Ativo. O animal em qualquer situação continua na ficha com o histórico e conta para a unicidade de nome *(D09)*

**Regras de negócio que valem aqui**

- REG-15, REG-16 e REG-17 as mesmas validações de nome, tamanho e data do cadastro (`domain.md` §2.3)
- REG-47 toda escrita bem-sucedida termina na ficha do dono (`domain.md` §2.6)

### US-4 (REQ-016) Exigir a espécie do animal também na edição

Como usuário do sistema, quero ser impedido de salvar um animal sem espécie ao editá-lo
para não receber uma falha do sistema em vez de uma mensagem de erro.

**Critérios de aceite**

- [ ] CA-4.1 Editar um animal apagando a espécie é recusado com mensagem traduzida no campo de espécie, e nada é gravado
- [ ] CA-4.2 A tentativa não produz erro genérico de sistema nem página de erro
- [ ] CA-4.3 A mesma regra vale na criação e na edição, declarada em um só lugar

**Regras de negócio que valem aqui**

- REG-20 um animal pertence a exatamente um dono e tem exatamente uma espécie (`domain.md` §2.3)
- REG-22 no legado, a espécie era obrigatória só na criação, e é essa a origem da contradição C1 (`domain.md` §2.3, §3)
- Decisão humana da Pergunta 5: a espécie é obrigatória sempre, inclusive na edição. A resposta é arbitragem, não preservação: o legado era incoerente consigo mesmo e nenhuma escolha mantinha o comportamento dele

> Nota de alcance, registrada na própria Pergunta 5: este caminho **não era alcançável pelo
> formulário renderizado** do legado, porque a lista de espécies não tinha opção vazia. Ele
> exigia requisição montada à mão. Isso não reduz a gravidade, uma falha de sistema num
> caminho público é falha de robustez, mas muda a redação do critério: CA-4.1 e CA-4.2 valem
> para a requisição, não apenas para a tela.

### US-5 (REQ-017) Recusar operação sobre animal que não pertence ao dono informado

Como usuário do sistema, quero que o sistema recuse de forma explícita um pedido que mistura
o animal de uma pessoa com a ficha de outra para que os dados de um cliente não apareçam sob
o nome de outro.

**Critérios de aceite**

- [ ] CA-5.1 Pedir a edição de um animal informando um dono que não é o dele responde "não encontrado", sem expor dado algum do animal
- [ ] CA-5.2 O mesmo vale para o agendamento de visita e para qualquer outro caminho que receba dono e animal juntos
- [ ] CA-5.3 Existe teste automatizado cobrindo essa combinação para cada caminho que recebe os dois identificadores
- [ ] CA-5.4 O caminho legítimo, com o animal do próprio dono, continua funcionando

**Regras de negócio que valem aqui**

- REG-20 um animal pertence a exatamente um dono e tem exatamente uma espécie (`domain.md` §2.3)
- REG-48 no legado, dono ou animal inexistente na URL produzia falha de sistema, não "não encontrado" (`domain.md` §2.6)
- Decisão humana da Pergunta 23: o isolamento entre clientes é requisito do sistema e deve ser verificado. No legado ele existia por acidente de estrutura e nenhum teste o protegia
- Princípio P1 da constituição: o dono é a única porta de entrada para animal e visita

## Fora de escopo

- **Situação do animal.** A resposta da Pergunta 16 decidiu acrescentar um campo de situação
  ao animal, para distinguir o que faleceu do que está vivo, e nenhum card do kanban traz
  critério de aceite para ele. O campo fica registrado no modelo de dados do `plan.md` como
  pendência declarada e repetido em Perguntas em aberto. Inventar critério para ele seria
  escrever requisito que nenhum card sustenta.
- **Apagar animal.** Nenhum card pede exclusão, e o princípio P2 da constituição autoriza
  anonimizar, não excluir. O animal não guarda dado pessoal direto, e o caminho de
  anonimização do dono é da feature 007.
- **Campos novos do animal.** Peso, raça, sexo, castração, microchip e observação não existem
  em card nenhum. A Pergunta 16 só decidiu a situação.
- **Manter o vocabulário de espécies.** Quem cria, altera e desativa espécie é a feature 009
  (card REQ-045). Esta feature **consome** o vocabulário e exige que ele seja fechado.
- **Agendar e registrar visita.** É a feature 004. Aqui a visita aparece apenas como o que
  CA-3.3 obriga a preservar e como um dos caminhos que CA-5.2 cobre.
- **A ficha do dono.** O destino de toda escrita desta feature é a ficha do dono, que é US-6
  da feature 001.
- **Tratar o "não encontrado" de forma genérica.** O tratador de erro e a página de erro são
  da feature 008. CA-5.1 fixa o resultado esperado; o mecanismo que o produz é de lá.

## Perguntas em aberto

- [x] **Quais são os bancos homologados do sistema novo?** CA-2.4 exige que a recusa concorrente seja idêntica em todos eles, e a lista não existe. O princípio P5 da constituição manda eleger um único dialeto como verdade, e a resposta da Pergunta 13 esvaziou a arqueologia sem fechar a decisão: o sistema nunca operou de verdade, logo não há perfil de produção a imitar. Enquanto a lista não existir, CA-2.4 é verificável sobre o dialeto eleito e não sobre um conjunto. → ✅ **P-05**: só PostgreSQL
- [x] **O campo de situação do animal, decidido na Pergunta 16, tem quais valores e quais transições?** Em particular: um animal falecido continua aparecendo na ficha do dono, continua aceitando visita nova, continua contando para a unicidade de nome por dono? Sem resposta, o campo não entra no esquema, porque cada uma dessas três perguntas muda CA-1.5, CA-2.1 e a leitura da ficha. → ✅ **D09**: Ativo, Falecido, Transferido
- [x] **A data de nascimento do animal passa a ser localizada?** REG-26 fixa o formato aaaa-mm-dd sem localização, e isso contradiz o princípio P7 e a feature 006, que manda todo texto visível vir do catálogo de tradução. O teste `UT-013-8` exige que uma data escrita em dd/mm/aaaa produza erro de campo, com mensagem própria, e não falha genérica de conversão, o que vale nos dois desenhos. O que não está decidido é se dd/mm/aaaa passa a ser **aceito** quando o idioma da sessão é português. → ✅ **P-03**: segue o idioma
- [x] **A comparação com o vocabulário de espécies ignora a caixa em qual camada?** O teste `UT-013-7` exige que o nome capitalizado resolva para o valor gravado em minúsculas. Isso pode ser normalização na entrada ou comparação insensível na consulta, e a escolha é observável quando a feature 009 permitir cadastrar duas espécies que diferem só pela caixa. Depende de REQ-045. → ✅ **P-10**: no banco e na aplicação
- [x] **O que acontece hoje quando o dono é gravado com a coleção de animais desatualizada?** A Pergunta 24 autorizou executar o cenário contra o legado sob o perfil padrão, e a execução não aconteceu em nenhuma etapa da análise. O resultado decide se CA-3.3 precisa apenas de fronteira transacional estreita ou de concorrência otimista também no animal. A pergunta é compartilhada com a feature 001. → ✅ coberta pela concorrência otimista (US-5 da 001); suíte do legado em decisoes.md §8

## Rastreabilidade

| item | vem de |
|---|---|
| US-1 | REQ-013 · UC-05 · REG-15 a REG-17, REG-20, REG-23 a REG-26 · `PetController.java:100`, `PetValidator.java:38`, `PetTypeFormatter.java:51`, `createOrUpdatePetForm.html:20` · ADR-0009 |
| US-2 | REQ-014 · UC-05, UC-06 · REG-18, REG-19 · `PetController.java:111,202`, `db/mysql/schema.sql:47`, `PetClinicConcurrencyTests.java:123` · ADR-0001 · contradição C2 |
| US-3 | REQ-015 · UC-06 · REG-15 a REG-17, REG-47 · `PetController.java:139,186`, `Owner.java:129` |
| US-4 | REQ-016 · UC-06 · REG-20, REG-22 · `PetValidator.java:51`, `PetController.java:194` · contradição C1 · Pergunta 5 |
| US-5 | REQ-017 · UC-06, UC-07 · REG-20, REG-48 · `PetController.java:75`, `VisitController.java:67`, `Owner.java:129` · Pergunta 23 |
