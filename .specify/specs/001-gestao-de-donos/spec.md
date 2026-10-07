# Gestão de donos

**Origem:** épico EP-1 do backlog do sistema legado (objetivo do épico: cadastrar, alterar e consultar a pessoa que leva o animal à clínica, que é a raiz de todo o domínio)
**Cards:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007

## Por que esta feature existe

O dono é o cliente da clínica e a raiz de escrita do sistema: no legado, 13 dos 17 pares de
método e rota tinham caminho sob o dono, e animal e visita só existiam pendurados nele.
Quem chega ao balcão é atendido a partir de uma ficha que reúne contato, animais e visitas,
e sem essa ficha nenhuma outra feature tem onde se pendurar.

O que o legado deixou de fora é tão importante quanto o que fazia. Não havia chave natural
de dono: duas pessoas com nome, endereço e telefone idênticos viravam dois cadastros sem
nenhum aviso, e nada impedia que dois cliques no botão criassem dois donos. Não havia
controle de concorrência: dois atendentes editando o mesmo cadastro resultavam no último
sobrescrevendo o primeiro em silêncio. E a mensagem de erro de validação era publicada por
um mecanismo que só sobrevive a redirecionamento, em um caminho que devolvia a própria
página, de modo que o aviso aparecia na requisição seguinte, fora de contexto.

## Histórias de usuário

### US-1 (REQ-001) Cadastrar dono com dados de contato

Como usuário do sistema, quero registrar uma pessoa nova com seus dados de contato para
passar a ter uma ficha dela na clínica.

**Critérios de aceite**

- [ ] CA-1.1 Com nome, sobrenome, endereço, cidade, celular e CPF preenchidos, o dono é gravado e o usuário termina na ficha do dono recém-criado
- [ ] CA-1.2 Qualquer um dos seis campos obrigatórios em branco devolve o formulário com o campo marcado, preservando o que foi digitado, e nada é gravado
- [ ] CA-1.3 Nome e sobrenome com mais de 30 caracteres, endereço com mais de 255 ou cidade com mais de 80 são recusados com erro no campo correspondente
- [ ] CA-1.4 Nenhum dado é gravado quando há erro de validação: a contagem de donos na base permanece a mesma
- [ ] CA-1.5 CPF com dígito verificador inválido é recusado no campo; CPF válido é gravado só com os dígitos *(D13)*
- [ ] CA-1.6 CPF já usado por outro dono é recusado no campo com mensagem traduzida, e o erro é reconhecido pelo tipo da violação de unicidade, nunca pelo texto *(D15)*
- [ ] CA-1.7 E-mail é opcional; quando informado, formato inválido ou mais de 254 caracteres é recusado no campo *(D13)*
- [ ] CA-1.8 O consentimento para receber mensagens é um campo explícito do dono, desmarcado por padrão, e a data em que foi dado fica registrada *(D12, D13)*

**Regras de negócio que valem aqui**

- REG-01 nome, sobrenome, endereço, cidade e telefone são todos obrigatórios (`domain.md` §2.1); **D13** acrescenta CPF obrigatório e e-mail opcional
- REG-02 nome e sobrenome até 30 caracteres, endereço até 255, cidade até 80 (`domain.md` §2.1)
- REG-47 toda escrita bem-sucedida termina na ficha do dono (`domain.md` §2.6)

### US-2 (REQ-002) Aceitar telefone no formato do país de operação

Como usuário do sistema, quero informar o telefone do dono no formato usado no país onde a
clínica opera para não ser impedido de cadastrar um cliente real.

**Critérios de aceite**

- [ ] CA-2.1 Um celular brasileiro válido é aceito com ou sem máscara e gravado normalizado em E.164 (`+55DDNNNNNNNNN`) *(D05)*
- [ ] CA-2.2 Um telefone inválido é recusado com mensagem traduzida no próprio campo, e nada é gravado
- [ ] CA-2.3 A regra de formato está declarada em um só lugar e o teste cobre ao menos um número válido e um inválido do país escolhido

**Regras de negócio que valem aqui**

- REG-03 no legado, telefone com exatamente dez dígitos, sem máscara nem código de país (`domain.md` §2.1)
- REG-06 o telefone é o único campo do sistema com validação de formato (`domain.md` §2.1)

> **D05:** o país é o Brasil e o campo é celular, porque é o destino do WhatsApp (D12).
> Os valores de teste de CA-2.3 são: válido `(11) 98765-4321`; inválidos `1234567890`
> (o padrão norte-americano do legado) e `(11) 3456-7890` (fixo).

### US-3 (REQ-003) Detectar possível dono já cadastrado

Como usuário do sistema, quero ser avisado quando os dados que estou digitando parecem ser
de alguém já cadastrado para não criar uma segunda ficha da mesma pessoa.

**Critérios de aceite**

- [ ] CA-3.1 *(D14: a coincidência é o mesmo celular)* Ao confirmar um cadastro cujos dados coincidem com os de um dono existente, o sistema apresenta o candidato encontrado antes de gravar
- [ ] CA-3.2 O usuário pode seguir com o cadastro mesmo assim, e a escolha fica registrada
- [ ] CA-3.3 Dois donos homônimos com contatos distintos continuam sendo aceitos sem alarme

**Regras de negócio que valem aqui**

- REG-04 não existe chave natural de dono: a identidade é o identificador gerado pelo banco (`domain.md` §2.1)
- Decisão humana da Pergunta 18: nenhuma chave natural, e sim aviso de similaridade mais proteção contra dupla submissão. O aviso nunca bloqueia por conta própria
- **D15** abre uma exceção só para o CPF: ele é único e bloqueia (CA-1.6). O aviso de similaridade fica para o celular (D14)
- **D16** a proteção contra dupla submissão vale para todos os formulários de gravação

### US-4 (REQ-004) Alterar os dados de contato de um dono

Como usuário do sistema, quero corrigir os dados de um dono já cadastrado para manter o
contato da clínica atualizado.

**Critérios de aceite**

- [ ] CA-4.1 O formulário de edição abre preenchido com os dados atuais do dono
- [ ] CA-4.2 Confirmada a alteração, o cadastro passa a ter os dados novos mantendo o mesmo identificador, e o usuário termina na ficha do dono
- [ ] CA-4.3 As mesmas validações do cadastro valem na edição: campo obrigatório vazio ou fora do tamanho devolve o formulário marcado e nada é gravado
- [ ] CA-4.4 Os animais e as visitas do dono permanecem exatamente como estavam

**Regras de negócio que valem aqui**

- REG-01, REG-02 e REG-06 as mesmas validações do cadastro valem na edição (`domain.md` §2.1)
- REG-05 na edição, o dono alterado tem de ser o mesmo identificado no endereço pedido (`domain.md` §2.1)
- REG-47 toda escrita bem-sucedida termina na ficha do dono (`domain.md` §2.6)
- Decisão humana da Pergunta 22: o contrato de entrada é um objeto próprio de entrada, com semântica declarada de alteração parcial. No legado, a edição ligava os campos enviados direto sobre a entidade carregada do banco, e por isso uma gravação sem nenhum campo era válida e idempotente

### US-5 (REQ-005) Impedir que duas edições simultâneas se sobrescrevam em silêncio

Como usuário do sistema, quero ser avisado quando o cadastro que estou editando mudou
enquanto eu preenchia o formulário para não apagar o trabalho de outra pessoa sem perceber.

**Critérios de aceite**

- [ ] CA-5.1 Dois usuários abrem o mesmo dono e gravam em sequência: a segunda gravação é recusada com aviso de que o cadastro mudou, e o conteúdo digitado é preservado na tela
- [ ] CA-5.2 O usuário recusado consegue ver os dados atuais e decidir se regrava
- [ ] CA-5.3 Uma edição isolada, sem concorrência, grava normalmente e não exibe aviso algum

**Regras de negócio que valem aqui**

- REG-43 no legado não havia controle de concorrência otimista: o último a gravar vencia, em silêncio (`domain.md` §2.6)

### US-6 (REQ-006) Consultar a ficha do dono com seus animais e visitas

Como usuário do sistema, quero ver num só lugar os dados de contato de um dono, seus
animais e as visitas de cada animal para atender quem chega ao balcão sem navegar por
várias telas.

**Critérios de aceite**

- [ ] CA-6.1 A ficha apresenta nome, sobrenome, endereço, cidade e telefone do dono
- [ ] CA-6.2 Os animais aparecem em ordem alfabética de nome e as visitas de cada animal em ordem crescente de data
- [ ] CA-6.3 A ficha oferece os atalhos de editar o dono, acrescentar animal, editar cada animal e agendar visita para cada animal
- [ ] CA-6.4 Um dono sem animal nenhum abre a ficha normalmente, com a seção de animais vazia
- [ ] CA-6.5 A consulta não altera nada na base

**Regras de negócio que valem aqui**

- REG-21 os animais de um dono aparecem em ordem alfabética de nome (`domain.md` §2.3)
- REG-32 as visitas de um animal aparecem em ordem crescente de data (`domain.md` §2.4)
- Decisão humana da Pergunta 19: o histórico de visitas é paginado dentro da ficha. No legado a ficha renderizava todos os animais e todas as visitas sem limite, e como nada era apagado o histórico só crescia

### US-7 (REQ-007) Confirmar na tela o resultado de cada gravação

Como usuário do sistema, quero ver imediatamente se a gravação deu certo ou errado para
não precisar conferir na lista se o que fiz foi registrado.

**Critérios de aceite**

- [ ] CA-7.1 Toda gravação bem-sucedida de dono, animal ou visita exibe a confirmação correspondente na requisição em que ocorreu, não na seguinte
- [ ] CA-7.2 Todo erro de gravação exibe a mensagem de erro na mesma requisição, junto ao formulário que a produziu
- [ ] CA-7.3 A mensagem desaparece sozinha após o tempo definido, e a tela não produz erro quando não há mensagem alguma a esconder

**Regras de negócio que valem aqui**

- REG-46 as mensagens de confirmação desaparecem sozinhas após três segundos (`domain.md` §2.6)
- REG-47 toda escrita bem-sucedida termina na ficha do dono (`domain.md` §2.6)
- Contradição C5 de `domain.md` §3: no legado a mensagem de erro de validação do dono era publicada por um mecanismo que só sobrevive a redirecionamento, em dois pontos que devolviam a própria página. O aviso aparecia na requisição seguinte. CA-7.1 e CA-7.2 arbitram em favor da mesma requisição

## Fora de escopo

- **Apagar dono.** Nenhum card desta feature pede exclusão, e o princípio P2 da constituição autoriza anonimizar, não excluir. O caminho de anonimização é da feature 007.
- **Autenticação e autorização.** Quem pode cadastrar, alterar ou ler a ficha de um cliente é assunto da feature 007. Nesta feature o ator é "usuário do sistema", deliberadamente genérico, porque o legado tinha um único ator humano e não o identificava de forma alguma (REG-42).
- **Buscar donos.** A busca por sobrenome, a paginação e o salto para a ficha quando há um só resultado são da feature 002.
- **Registrar quem alterou.** D02 decidiu autoria por pessoa. As colunas `criado_por` e `alterado_por` nascem no modelo desta feature, e quem as preenche e as torna consultáveis é a feature 007.

## Perguntas em aberto

Todas foram respondidas em `memory/decisoes.md`:

- [x] País de operação e formato de telefone → **D05**, Brasil, celular em E.164.
- [x] Campos que caracterizam dono parecido → **D14**, mesmo celular.
- [x] E-mail e documento do dono → **D13**: CPF obrigatório e único (D15), e-mail opcional até 254.
- [x] Alcance da proteção contra dupla submissão → **D16**, todos os formulários de gravação.
- [x] Gravação com a coleção de animais desatualizada → coberta pela concorrência otimista de US-5. A suíte do legado passou no perfil padrão (decisoes.md §8), e o desenho do sistema novo não depende de reproduzir o comportamento antigo.

## Rastreabilidade

| item | vem de |
|---|---|
| US-1 | REQ-001 · UC-02 · REG-01, REG-02, REG-47 · `OwnerController.java:64,77`, `Owner.java:53`, `createOrUpdateOwnerForm.html:10` |
| US-2 | REQ-002 · UC-02, UC-03 · REG-03, REG-06 · `Owner.java:64` · D-DET-05 |
| US-3 | REQ-003 · UC-02 · REG-04 · `BaseEntity.java:35` · Pergunta 18 |
| US-4 | REQ-004 · UC-03 · REG-01, REG-02, REG-05, REG-06, REG-47 · `OwnerController.java:148,153` · Pergunta 22 |
| US-5 | REQ-005 · UC-03, UC-06 · REG-43 · `BaseEntity.java:35` · Pergunta 24 |
| US-6 | REQ-006 · UC-04 · REG-21, REG-32 · `OwnerController.java:178`, `Owner.java:69`, `Pet.java:58`, `ownerDetails.html:17` · Pergunta 19 |
| US-7 | REQ-007 · UC-02 a UC-07 · REG-46, REG-47 · `OwnerController.java:80`, `ownerDetails.html:13,80` · contradição C5 |
