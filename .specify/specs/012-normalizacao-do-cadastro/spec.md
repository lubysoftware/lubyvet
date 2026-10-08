# Normalização do cadastro

**Origem:** análise de normalização de dados feita depois da 011 (sessão de 08/10/2026)
**Cards:** nenhum. Decisões D49 a D52.

## Por que esta feature existe

A análise de normalização conferiu tabelas, relacionamentos e campos múltiplos. A parte de
integridade (chaves estrangeiras, CHECK, consistência das redundâncias) já foi entregue no
próprio banco. Sobraram quatro lacunas de modelo, que o banco e a tela não representavam:

- o dono só tem **um telefone**, e na vida real o celular do WhatsApp não é o único contato;
- o **endereço é um texto só**, sem UF nem CEP, e não se valida nem se agrupa;
- a dispensa do aviso de dono parecido guarda **só a última data**, sem quem dispensou nem
  contra qual dono;
- a **especialidade não tem manutenção**: não se cria, não se renomeia, não se inativa, e o
  vínculo com o veterinário não se desfaz (P-11 estava em aberto).

**O que não muda:** as rotas, os campos e os status que já existem (P9). Tudo o que entra no
contrato é aditivo, e os testes de aceitação de 001 a 011 continuam verificando o mesmo.

## Histórias de usuário

### US-1 Registrar vários telefones do dono (D49)

Como atendente, quero registrar além do celular do WhatsApp outros telefones do dono, para ter
como falar com ele quando o celular não atende.

**Critérios de aceite**

- [ ] CA-1.1 É possível gravar o dono com até quatro telefones adicionais, celular ou fixo, e eles voltam na ficha na ordem informada, formatados
- [ ] CA-1.2 Telefone adicional inválido, repetido no mesmo dono (inclusive igual ao celular principal) ou acima de quatro é recusado no próprio campo
- [ ] CA-1.3 Na alteração, a lista enviada substitui a anterior, e a alteração que não a envia não muda os telefones
- [ ] CA-1.4 O aviso de dono parecido aparece quando qualquer telefone do dono, principal ou adicional, já pertence a outro dono
- [ ] CA-1.5 A mensagem de WhatsApp continua indo só para o celular principal
- [ ] CA-1.6 A anonimização remove os telefones adicionais e mantém o histórico do dono
- [ ] CA-1.7 Na tela é possível acrescentar e retirar telefones adicionais no formulário do dono

### US-2 Estruturar o endereço do dono (D50)

Como clínica, quero o endereço do dono com número, bairro, UF e CEP separados, para validá-lo
e poder agrupar donos por região.

**Critérios de aceite**

- [ ] CA-2.1 O dono novo é gravado com logradouro, número, complemento opcional, bairro, cidade, UF e CEP, e eles voltam separados na ficha
- [ ] CA-2.2 UF fora das 27 siglas e CEP sem oito dígitos são recusados no próprio campo; o CEP aceita máscara e é gravado só com os dígitos
- [ ] CA-2.3 O dono cadastrado antes da mudança continua legível: os campos novos vêm vazios e a tela mostra o endereço como estava
- [ ] CA-2.4 A tela pede os campos novos ao editar um dono antigo, e a gravação parcial que não toca no endereço continua aceita
- [ ] CA-2.5 O banco recusa UF e CEP fora do formato mesmo gravando por fora da aplicação
- [ ] CA-2.6 A anonimização apaga também número, complemento, bairro, UF e CEP

### US-3 Guardar o histórico da dispensa do aviso de dono parecido (D51)

Como Administrador, quero saber quem dispensou o aviso de dono parecido, quando e contra qual
dono, para auditar cadastros duplicados.

**Critérios de aceite**

- [ ] CA-3.1 Cada dispensa grava uma linha por candidato apresentado, com o dono gravado, o dono parecido, quem dispensou e quando
- [ ] CA-3.2 O Administrador lê a lista de dispensas do dono, da mais recente para a mais antiga; Leitura e Escrita recebem 403
- [ ] CA-3.3 A ficha do dono mostra a lista ao Administrador e não a mostra aos outros papéis
- [ ] CA-3.4 A data da última dispensa no dono é a mesma da linha mais recente do histórico, e a consulta de consistência acusa a divergência

### US-4 Manter as especialidades (D52)

Como Administrador, quero incluir, renomear e inativar especialidades, e retirar uma
especialidade de um veterinário, sem depender de acesso ao banco.

**Critérios de aceite**

- [ ] CA-4.1 É possível incluir uma especialidade, e ela fica disponível para atribuir na consulta seguinte
- [ ] CA-4.2 É possível renomear uma especialidade, e os veterinários que a têm passam a mostrar o nome novo no catálogo
- [ ] CA-4.3 Nome repetido, sem diferenciar maiúsculas, é recusado no próprio campo
- [ ] CA-4.4 Especialidade inativa não se atribui mais, e continua nos veterinários que já a têm
- [ ] CA-4.5 É possível retirar uma especialidade de um veterinário, e o catálogo reflete na consulta seguinte
- [ ] CA-4.6 Alteração com versão vencida é recusada com 409, e só o Administrador mantém especialidade
- [ ] CA-4.7 A tela de administração tem a aba de especialidades (incluir, renomear, inativar e reativar) e o botão de retirar especialidade do veterinário

## Fora de escopo

- **Consulta de CEP em serviço externo.** Seria dependência nova fora do cluster (D36) e sem
  decisão.
- **Converter o endereço antigo.** O texto livre não se divide sem adivinhar (D50).
- **Telefone com ramal ou internacional.** O país de operação é o Brasil (D05).
- **Desfazer a dispensa do aviso.** O histórico só registra.

## Perguntas em aberto

Nenhuma. As quatro formas foram tomadas em D49 a D52, pela recomendação da análise.

## Rastreabilidade

| item | vem de |
|---|---|
| US-1 | análise de normalização · `owners.telephone` único · D05, D12, D14, D24 · D49 |
| US-2 | análise de normalização · `owners.address` texto livre · D13 · D50 |
| US-3 | análise de normalização · `owners.similarity_dismissed_at` sem autoria · D02, D14 · D51 |
| US-4 | análise de normalização · P-11 em aberto · 009/US-2 · D48 · D52 |
