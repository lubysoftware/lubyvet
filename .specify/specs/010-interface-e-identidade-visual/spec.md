# Interface e identidade visual

**Origem:** épico EP-10 do backlog do sistema legado (objetivo do épico: uma interface legível, acessível e sem herança de estilo morta)
**Cards:** REQ-047, REQ-048, REQ-049

## Por que esta feature existe

O estilo do legado é o caso mais extremo de dívida silenciosa que a análise encontrou, e o
achado central é este: **o tema de estilo não tinha efeito algum sobre o que era servido ao
navegador**. O arquivo de tema era de uma versão anterior do framework de estilo rodando contra
outra, com a importação do framework feita **antes** de todas as variáveis e catorze de
vinte e três nomes de variável já extintos. As vinte e três variáveis declaradas tinham efeito
**zero**, e isso não é inferência: foi provado por comparação entre o que o fonte pedia e a
folha compilada **versionada no próprio repositório**. O tema pedia cantos retos e a folha
entregava arredondados; o tema pedia a cor de link do produto e a folha entregava a cor padrão
do framework; a busca pela cor pedida na folha compilada devolvia zero ocorrências.

Dessa folha de 9.531 linhas, vinte e dois seletores eram mortos, de procedência de **outro
produto** inteiramente diferente, e correspondiam a cerca de cento e quarenta das duzentas e
cinquenta e cinco linhas do bloco customizado. O maior módulo do sistema em linhas era também
o de menor acoplamento: em orçamento de reescrita isso não é trabalho, é decisão de descarte.

E havia uma dívida de impacto funcional, não cosmético: **catorze classes de estilo órfãs em
trinta e nove ocorrências**, justamente as que marcariam o campo com erro e organizariam a
disposição dos quatro formulários do sistema, e a folha servida não as definia. O grid dos
formulários estava apoiado em classes que ninguém definia.

> **Uma ressalva que vale para a feature inteira.** A aplicação **nunca foi executada** em
> nenhuma etapa deste processo e **nenhum screenshot foi fornecido**. Toda afirmação sobre
> aparência renderizada está marcada como confiança vermelha. O que está provado é o que está
> em arquivo: o que o fonte pede, o que a folha compilada entrega, quais classes são usadas
> pelos templates e quais a folha define, e quais pesos de fonte existem nos arquivos de fonte.
> **A extensão do dano visual não foi observada**, e isso está em Perguntas em aberto.

## Histórias de usuário

### US-1 (REQ-047) Não versionar estilo compilado nem manter tema sem efeito

Como responsável pelo estilo do sistema, quero que o que é servido ao navegador seja produto do
build e tenha efeito sobre a tela para não manter nove mil linhas que ninguém regera e
vinte e três variáveis que não mudam nada.

**Critérios de aceite**

- [ ] CA-1.1 Nenhum arquivo de estilo compilado é versionado no sistema novo: o estilo servido é produto do build
- [ ] CA-1.2 Não existe variável de tema declarada sem efeito sobre o que é servido, verificado por comparação entre o pedido no fonte e o resultado do build
- [ ] CA-1.3 Nenhum seletor de estilo sem elemento correspondente permanece na folha publicada

> **Card marcado como descarte no backlog.** Ele não pede nada construído: pede que 9.919 linhas
> **não** sejam portadas, e os três critérios são as verificações que impedem a dívida de
> renascer. É a dívida DT-14.
>
> CA-1.2 é o critério mais incomum de todo o pacote, e merece atenção: ele pede uma verificação
> que **compare o pedido com o entregue**. A razão é que no legado as duas coisas estavam no
> repositório, lado a lado, divergindo, e ninguém percebeu, porque a folha compilada era
> versionada e o perfil de build que a gerava não era ativado por padrão. A ferramenta que a
> gerava, aliás, está **abandonada** desde que a linha dela foi descontinuada, o que agrava o
> quadro: a geração pode estar quebrada sem que ninguém perceba, porque o resultado está
> comitado.

### US-2 (REQ-048) Garantir contraste e legibilidade mínimos na interface

Como usuário do sistema, quero ler confortavelmente a interface em qualquer tela para trabalhar
o dia inteiro sem esforço e sem excluir quem enxerga menos.

**Critérios de aceite**

- [ ] CA-2.1 *(D07: WCAG 2.2 AA, 4,5:1 para texto normal e 3:1 para texto grande e componentes)* Todo texto e todo elemento de navegação atendem ao contraste mínimo exigido pelo padrão de acessibilidade adotado, inclusive nos estados de foco e de passagem do ponteiro
- [ ] CA-2.2 Nenhum peso de fonte é sintetizado pelo navegador: todo peso usado existe em arquivo
- [ ] CA-2.3 A verificação de contraste é automatizada e falha o build quando uma cor nova a infringe

> O card está em refinamento no backlog porque **o padrão de acessibilidade a adotar e o nível
> exigido não foram definidos**, e CA-2.1 depende dos dois. O que a análise mediu, sobre os
> valores que estão em arquivo: a navegação reprova em repouso, com razão de 3,6 para 1, e
> reprova mais na passagem do ponteiro, com 2,2 para 1. E há um achado que precisa estar aqui
> porque muda a conversa: **restaurar a cor de link original do tema também reprovaria**, com
> 3,2 para 1. Ou seja, a identidade visual que o tema pedia e nunca entregou não é a solução do
> problema de contraste, é outra forma dele.
>
> CA-2.2 é o único critério desta história que é inteiramente concreto hoje: o legado pedia peso
> negrito em três lugares e **nenhum dos oito arquivos de fonte tinha esse peso**, só o peso
> normal. O resultado é negrito sintetizado pelo navegador, que é precisamente o que o critério
> proíbe.

### US-3 (REQ-049) Marcar visivelmente o campo com erro nos formulários

Como usuário do sistema, quero ver imediatamente qual campo do formulário está errado para
corrigir sem reler a tela inteira.

**Critérios de aceite**

- [ ] CA-3.1 Um campo recusado pela validação fica visualmente destacado e tem a mensagem de erro junto a ele
- [ ] CA-3.2 A indicação de erro não depende apenas de cor: é perceptível também por texto ou ícone
- [ ] CA-3.3 O destaque existe nos quatro formulários do sistema, verificado por teste de interface

> É a dívida de maior impacto **funcional** do estilo, e não cosmético: das catorze classes
> órfãs, as que marcariam erro e dariam retorno visual estavam entre elas, e a folha servida não
> as definia. Havia também um ícone referenciado que **não existe** na versão da biblioteca de
> ícones que o projeto usava, e uma animação referenciada cuja definição não existe em lugar
> algum.
>
> CA-3.2 é a parte que o legado não tentou e que vale mais que o resto: a indicação por cor só
> exclui quem não distingue aquelas cores, e `UT-049-2` exige que a marcação venha com texto
> resolvido pelo catálogo de traduções, não apenas com a indicação de estado do campo. CA-3.1 e
> CA-3.2 são verificáveis pelo **modelo** entregue à tela, e por isso têm teste de unidade;
> CA-3.3 não é, e isso está dito no critério.

## Fora de escopo

- **Redesenhar a interface.** Nenhum card pede tela nova, fluxo novo ou identidade visual nova.
  Esta feature trata de descartar dívida, garantir contraste e marcar erro.
- **A mensagem de erro em si.** De onde vem o texto é a feature 006, pelo princípio P7. Esta
  feature trata de **onde e como** ele aparece.
- **O tempo de vida visual da mensagem de resultado.** É CA-7.3 da feature 001, e lá está dito
  que é teste de interface.
- **As telas de cada feature.** O conteúdo da ficha do dono, da listagem, dos formulários e do
  catálogo pertence às features 001 a 005. Aqui estão as propriedades que valem para todas.
- **A ferramenta de compilação de estilo.** CA-1.1 exige que o estilo seja produto do build; qual
  compilador é decisão de stack, e a do legado está abandonada. Está em Perguntas em aberto.
- **Os arquivos de fonte obsoletos.** Dos 652 KB de fonte do legado, 493 KB eram formatos
  obsoletos e **não havia o formato moderno**. CA-2.2 trata do peso, não do formato, e nenhum
  card trata do formato. Fica registrado no `plan.md` como observação.
- **A inconsistência dos pontos de quebra.** A análise encontrou três desalinhados, com um deles
  se sobrepondo a outro por um pixel. Nenhum card pede, e por isso é observação, não história.

## Perguntas em aberto

- [x] **Qual padrão de acessibilidade e qual nível?** Bloqueia CA-2.1 por inteiro, e o próprio card registra a lacuna. Sem o nível não existe o número que o critério compara, e três dos valores medidos pela análise reprovam no nível mais comum enquanto um quarto, a cor de link original do tema, também reprovaria. → ✅ **D07**: WCAG 2.2 AA
- [x] **A aplicação pode ser executada e observada?** É a pergunta de maior alavancagem desta feature, e ela não está em `questions.md`: a aplicação nunca foi executada e nenhum screenshot foi fornecido, de modo que **a extensão do dano visual das catorze classes órfãs nunca foi vista**. O que está provado é que a folha não define as classes; o que isso produz na tela é confiança vermelha. Uma execução e quatro capturas de tela, uma por formulário, fecham a dúvida. → ✅ **D21**: upstream clonado; suíte verde (decisoes.md §8)
- [x] **A identidade visual do legado é para preservar?** A cor que o tema pedia nunca chegou à tela, e restaurá-la reprovaria no contraste. Preservar a identidade e cumprir CA-2.1 podem ser incompatíveis com essa cor específica, e a decisão é de quem responde pela marca, não do agente. → ✅ **D23**: identidade nova LubyVet
- [x] **Qual é a família de fontes e quais pesos?** CA-2.2 exige que todo peso usado exista em arquivo, e a escolha da família determina quais pesos existem. O legado tinha oito arquivos com um peso só. → ✅ **D37**: Figtree 400/500/600/700
- [x] **Qual compilador de estilo?** CA-1.1 exige que o estilo servido seja produto do build, e a ferramenta do legado está abandonada desde que a linha dela foi descontinuada. É decisão de stack e está no `plan.md`. → ✅ **D23**: Tailwind
- [x] **Quatro formulários continuam sendo quatro?** CA-3.3 fala "os quatro formulários do sistema", contando os do legado: dono, animal, visita e busca. As features 007 e 009 acrescentam formulários novos, de identidade e de manutenção de vocabulário, e o critério precisa alcançá-los ou dizer que não alcança. → ✅ não: dono, animal, agendamento, atendimento e os administrativos (plan da 010)

## Rastreabilidade

| item | vem de |
|---|---|
| US-1 | REQ-047 · `scss/petclinic.scss:14`, `static/resources/css/petclinic.css` · dívida DT-14 · `design-system/design-system.md` · card de descarte |
| US-2 | REQ-048 · UC-01, UC-04, UC-08 · `static/resources/css/petclinic.css` · `design-system/color-palette.md`, `design-system/typography.md` · D-DS-02, D-DS-07, D-DS-11, D-DS-12 |
| US-3 | REQ-049 · UC-02, UC-03, UC-05, UC-07 · `fragments/inputField.html`, `static/resources/css/petclinic.css` · as 14 classes órfãs de `design-system/design-system.md` |
