# Idioma e comunicação com o usuário

**Origem:** épico EP-6 do backlog do sistema legado (objetivo do épico: falar com quem usa o sistema no idioma escolhido, do começo ao fim da tela)
**Cards:** REQ-029, REQ-030, REQ-031, REQ-032

## Por que esta feature existe

O legado tinha a interface traduzida em **10 idiomas**, com a completude verificada por teste,
e essa era uma das poucas regras do sistema protegida de propósito. Ao mesmo tempo, as seis
mensagens de confirmação de gravação estavam escritas em texto fixo dentro do código, fora do
catálogo de tradução, e o teste que protegia a tradução **só examinava os templates**, por
isso passava sem ver o vazamento. A tradução se rompia exatamente onde o usuário mais olha,
depois de salvar. No formulário de visita o caso é mais explícito ainda: dois rótulos em texto
fixo ficam dezesseis linhas acima de onde o mesmo arquivo usa as chaves de tradução
correspondentes, na mesma tela.

E havia um investimento feito e não colhido: **nenhum seletor de idioma em nenhuma tela**. A
troca só acontecia para quem sabia que um parâmetro de endereço existia. Dez traduções
mantidas, verificadas por teste e inalcançáveis pela interface.

> **Correção de contagem, decidida na Pergunta 25.** Boa parte dos artefatos deste processo
> diz "11 idiomas". São **11 arquivos de catálogo e 10 idiomas**: o arquivo de inglês tem zero
> chave e existe apenas para que o pedido daquele idioma resolva por recurso ao catálogo
> padrão, e o próprio teste de sincronia do legado o pulava, com o motivo escrito no código. A
> resposta humana foi manter o arquivo vazio e corrigir a contagem. Esta spec usa 10 idiomas,
> e a correção vale também para a menção a 11 idiomas no princípio P7 da constituição e nas
> Perguntas em aberto da feature 001.

## Histórias de usuário

### US-1 (REQ-029) Trocar o idioma da interface

Como usuário do sistema, quero ler o sistema no meu idioma pelo resto da visita para
trabalhar sem traduzir mentalmente cada rótulo.

**Critérios de aceite**

- [ ] CA-1.1 Escolhido um idioma, toda a interface passa a ser apresentada nele e a escolha vale para as requisições seguintes
- [ ] CA-1.2 Um idioma não suportado recai no idioma padrão, sem erro e sem tela em branco
- [ ] CA-1.3 Sem nenhuma escolha feita, o sistema serve o idioma padrão definido

**Regras de negócio que valem aqui**

- REG-44 toda a interface é traduzível, e a tradução completa é verificada por teste (`domain.md` §2.6, ADR-0006)
- REG-45 o idioma é trocado por parâmetro em qualquer endereço e persiste na sessão (`domain.md` §2.6)
- Máquina de estados EM-06 de `state-machines.md`: o idioma na sessão era uma das seis máquinas de estado não declaradas do legado

> CA-1.3 é decisão explícita, não acidente: `UT-029-3` exige que, numa sessão nova em que o
> cliente **declara** uma preferência de idioma diferente do padrão, o idioma servido seja o
> padrão configurado. É assim que o legado se comportava, e o card manda preservar.

### US-2 (REQ-030) Traduzir também as mensagens de gravação e os rótulos de formulário

Como usuário do sistema, quero que a confirmação da gravação apareça no idioma escolhido para
não encontrar o idioma padrão exatamente onde mais olho depois de salvar.

**Critérios de aceite**

- [ ] CA-2.1 Com o idioma trocado, nenhuma mensagem de confirmação ou de erro de gravação aparece no idioma padrão
- [ ] CA-2.2 Nenhum rótulo de formulário aparece como texto fixo: todos vêm do vocabulário de tradução
- [ ] CA-2.3 O teste que verifica a completude das traduções cobre também as mensagens produzidas fora dos templates, e falha quando um texto fixo é introduzido

**Regras de negócio que valem aqui**

- REG-44 toda a interface é traduzível, e a tradução completa é verificada por teste (`domain.md` §2.6, ADR-0006)
- Princípio P7 da constituição: nenhum texto visível ao usuário nasce literal no código

> CA-2.3 é a parte que impede a regressão, e é a lição exata do legado: a regra existia, o
> teste existia, e o teste não cobria o lugar por onde ela vazava. Um teste de completude que
> olha só os templates não é uma versão mais fraca da regra, é a ilusão dela.

### US-3 (REQ-031) Oferecer a troca de idioma na própria interface

Como usuário do sistema, quero trocar o idioma por um controle na tela para não precisar saber
escrever um parâmetro na barra de endereço.

**Critérios de aceite**

- [ ] CA-3.1 Existe em todas as telas um controle visível de troca de idioma, listando os idiomas suportados
- [ ] CA-3.2 Trocar pelo controle produz o mesmo efeito de trocar pelo parâmetro de endereço
- [ ] CA-3.3 O idioma em uso está indicado no controle

**Regras de negócio que valem aqui**

- REG-45 o idioma é trocado por parâmetro em qualquer endereço e persiste na sessão (`domain.md` §2.6)

> CA-3.2 pede o **mesmo caminho de resolução**, não dois caminhos com o mesmo resultado
> (`UT-031-2`). Duas formas de trocar idioma com duas implementações divergem na primeira
> mudança, e a que ninguém usa é a que ninguém conserta.

### US-4 (REQ-032) Não manter mensagem traduzida sem consumidor

Como responsável pelo vocabulário de tradução, quero que nenhuma chave sobreviva sem alguém
que a use para não pagar tradução em todos os idiomas por uma regra que não existe mais.

**Critérios de aceite**

- [ ] CA-4.1 O vocabulário de tradução do sistema novo não contém chave sem consumidor
- [ ] CA-4.2 Existe verificação automatizada que falha quando uma chave deixa de ser referenciada por código ou template

**Regras de negócio que valem aqui**

- REG-44 toda a interface é traduzível, e a tradução completa é verificada por teste (`domain.md` §2.6)

> **Card marcado como descarte no backlog.** Ele não pede nada construído: pede que três
> mensagens do legado **não** sejam reescritas, e os dois critérios são a verificação que
> impede novas. As três são fósseis de regras extintas, mantidas e traduzidas em todos os
> idiomas sem que nenhum código ou tela as usasse: "deve ser só numérico", provável ancestral
> da regra de telefone; "submissão duplicada de formulário não é permitida"; e "data inválida"
> genérica. O catálogo do legado tinha também o problema inverso, que CA-4.2 não cobre e a
> verificação precisa cobrir: **duas chaves usadas pelo código e inexistentes em arquivo
> algum**, que caíam em texto fixo no idioma padrão.
>
> A segunda mensagem fóssil merece nota, porque ela deixou de ser fóssil: a proteção genérica
> contra dupla submissão, que ela descrevia e que nunca foi implementada, passou a ser
> requisito pela resposta da Pergunta 18, e está na feature 001, em US-3 dela. O card de
> descarte previu exatamente isso ao dizer que, se virar requisito, entra como card próprio e
> não como mensagem órfã.

## Fora de escopo

- **Mudar a lista de idiomas suportados.** A Pergunta 25 decidiu manter o arquivo vazio de
  inglês e corrigir só a contagem, o que preserva os 10 idiomas do legado. Acrescentar ou
  remover idioma não está em card algum.
- **Localizar formato de data e de número.** Nenhum card pede, e há uma contradição conhecida
  entre o princípio P7 e REG-26, que fixa o formato de data do animal sem localização. Está em
  Perguntas em aberto aqui e na feature 003.
- **Traduzir conteúdo cadastrado pelo usuário.** Nome de espécie e nome de especialidade são
  dado, não rótulo, e o legado os guardava em uma língua só. Nenhum card pede o contrário.
- **A mensagem de resultado aparecer na mesma requisição.** Isso é CA-7.1 e CA-7.2 da
  feature 001, e é problema de mecanismo de publicação, não de tradução. Esta feature garante
  que, quando a mensagem aparecer, ela esteja no idioma escolhido.
- **O tempo de vida visual da mensagem na tela.** É CA-7.3 da feature 001.
- **A acessibilidade e o contraste dos rótulos.** É a feature 010.

## Perguntas em aberto

- [x] **Qual é o idioma padrão do sistema novo?** CA-1.2 e CA-1.3 dependem dele e são verificáveis contra qualquer valor configurado, mas o valor em si não está em card nenhum. No legado o padrão era o inglês, coerente com uma aplicação de demonstração de projeto internacional, e a decisão aqui se liga à do país de operação, que é pergunta em aberto da feature 001 e bloqueia a regra de telefone (dúvida D-DET-05). As duas respondidas juntas custam uma conversa. → ✅ **P-01**: pt-BR
- [x] **A verificação de completude trata o arquivo vazio de recurso como exceção declarada?** A Pergunta 25 decidiu manter o arquivo de inglês vazio, e o teste do legado o pulava com o motivo escrito no código. CA-2.3 e CA-4.2 exigem verificação que falhe por chave faltante; se o arquivo vazio não for exceção explícita, a verificação falha por desenho, e se a exceção não for explícita, ela some na primeira refatoração. → ✅ moot: nenhum catálogo do legado é portado; P-02 define pt-BR e en
- [x] **Formato de data e de número acompanham o idioma?** REG-26 fixa o formato de data do animal sem localização, e o princípio P7 manda todo texto visível vir do catálogo. Uma data não é exatamente texto, e por isso a contradição é real e não é deslize de redação. A pergunta é compartilhada com a feature 003, onde ela muda o critério de aceite do cadastro de animal. → ✅ **P-03**: seguem o idioma
- [x] **A proteção genérica contra dupla submissão vale para quais formulários?** É a dúvida D-DET-07, e ela reaparece aqui porque a chave de tradução correspondente existia traduzida e sem consumidor. A Pergunta 18 a transformou em requisito para o formulário de dono; se valer para os de animal e de visita, a chave ganha três consumidores e deixa de ser fóssil. A pergunta é compartilhada com a feature 001. → ✅ **D16**: todos os formulários de gravação
- [x] **O controle de troca de idioma aparece também nas telas que a feature 008 serve?** CA-3.1 diz "em todas as telas", e a página de erro e a superfície de gestão são de lá. A página de erro no legado não tinha nada: nem seletor, nem tradução verificada. → ✅ **P-04**: sim, em todas as telas

## Rastreabilidade

| item | vem de |
|---|---|
| US-1 | REQ-029 · UC-10 · REG-44, REG-45 · `WebConfiguration.java:44`, `application.properties:16` · EM-06 de `state-machines.md` |
| US-2 | REQ-030 · UC-10, UC-02, UC-05, UC-07 · REG-44 · `createOrUpdateVisitForm.html:32`, `I18nPropertiesSyncTest.java:40` · ADR-0006 · princípio P7 |
| US-3 | REQ-031 · UC-10 · REG-45 · `WebConfiguration.java:55` |
| US-4 | REQ-032 · UC-10 · REG-44 · `messages/messages.properties` · D-DET-07 · card de descarte |
