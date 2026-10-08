# Tarefas, Normalização do cadastro

> Ordem de dependência. A coluna *satisfaz* aponta o critério de aceite do `spec.md`. Cada
> tarefa termina com `bun run verify` verde e com o teste de aceitação `012/CA-x.y` de cada
> critério que satisfaz.

## US-4 Manter as especialidades (D52)

- [x] **T001** Manutenção de especialidade na API
      *entrega:* migração com `status` e `version` em `specialties` e o CHECK; rotas `POST` e
      `PATCH /api/admin/specialties`; `GET` com situação, versão e contagem; `removeSpecialtyId`
      no veterinário; recusa de especialidade inativa; matriz de papéis; testes de aceitação
      *satisfaz:* CA-4.1 a CA-4.6
      *depende de:* —

- [x] **T002** Aba de especialidades e retirada no veterinário
      *entrega:* aba "Especialidades" na administração e botão de retirar especialidade do
      veterinário, com teste de componente e Playwright
      *satisfaz:* CA-4.7
      *depende de:* T001

## US-3 Histórico da dispensa (D51)

- [x] **T003** Gravar e ler o histórico da dispensa
      *entrega:* tabela `owner_similarity_dismissals`; registrar e alterar gravam uma linha por
      candidato; rota de leitura do Administrador; consulta de consistência acrescentada;
      testes de aceitação
      *satisfaz:* CA-3.1, CA-3.2, CA-3.4
      *depende de:* —

- [x] **T004** Histórico da dispensa na ficha do dono
      *entrega:* seção na ficha visível só ao Administrador, com teste de componente
      *satisfaz:* CA-3.3
      *depende de:* T003

## US-1 Vários telefones (D49)

- [ ] **T005** Telefones adicionais na API
      *entrega:* tabela `owner_phones`; regra de telefone fixo ou celular; `otherPhones` na
      entrada e na saída; dono parecido por qualquer telefone; anonimização; testes de aceitação
      *satisfaz:* CA-1.1 a CA-1.6
      *depende de:* T003

- [ ] **T006** Telefones adicionais na tela
      *entrega:* lista editável no formulário do dono e telefones na ficha, com teste de
      componente e Playwright
      *satisfaz:* CA-1.7
      *depende de:* T005

## US-2 Endereço estruturado (D50)

- [ ] **T007** Endereço estruturado na API
      *entrega:* colunas novas e CHECK; regras de UF e CEP; campos no contrato; anonimização;
      testes de aceitação
      *satisfaz:* CA-2.1, CA-2.2, CA-2.3, CA-2.5, CA-2.6
      *depende de:* T005

- [ ] **T008** Endereço estruturado na tela
      *entrega:* campos no formulário (UF por seleção), endereço formatado na ficha, dono antigo
      com o texto como estava, e a rastreabilidade passando a exigir a 012
      *satisfaz:* CA-2.3, CA-2.4
      *depende de:* T007
