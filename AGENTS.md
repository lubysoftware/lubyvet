# AGENTS.md — LubyVet

Sistema de balcão de clínica veterinária: donos, animais, agendamentos, atendimentos e o
catálogo de veterinários. É uma reescrita a partir de especificações (derivadas da
engenharia reversa do spring-petclinic), não uma migração de código: nenhum arquivo do
legado entra aqui.

Este arquivo é o canônico. `CLAUDE.md` só aponta para ele. Dentro de `apps/api`,
`apps/web` e `packages/contracts`, o `AGENTS.md` da pasta acrescenta regras e prevalece
na sua pasta.

## Fontes de verdade, nesta ordem

1. **`memory/constitution.md`**: 9 princípios e 8 itens não negociáveis. Releia antes de
   cada tarefa. Diante de um item não negociável, **pare e pergunte**.
2. **`memory/decisoes.md`**: as decisões humanas (D01–D44) e os padrões propostos
   (P-01–P-25). Prevalece sobre qualquer trecho antigo de spec ou plano.
3. **`.specify/specs/NNN-*/`**: `spec.md` diz o quê, `plan.md` diz como, `tasks.md` é o
   que se executa, uma tarefa por vez.
4. **Design system**: https://claude.ai/artifact/23K7PeRUqVMc6XjjvWY8Lj (D42). Leia o
   `project/README.md` dele antes de criar qualquer tela ou componente.
5. **`docs/padroes/`**: como o código é escrito e testado aqui.

| arquivo | quando ler |
|---|---|
| `docs/padroes/arquitetura.md` | antes de criar módulo, porta, adaptador ou caso de uso |
| `docs/padroes/codigo.md` | sempre |
| `docs/padroes/testes.md` | antes de escrever o primeiro teste de uma tarefa |
| `docs/padroes/contratos.md` | antes de criar ou mudar rota, schema ou código de erro |
| `docs/padroes/banco.md` | antes de mexer em schema Prisma ou migração |
| `docs/padroes/frontend.md` | antes de criar tela, formulário ou componente |
| `docs/padroes/git.md` | antes do commit |

## Mapa do repositório

```
apps/api/              NestJS: domínio, casos de uso, adaptadores (Prisma, Redis, RabbitMQ, Meta)
apps/web/              Next.js (App Router), shadcn/ui, Tailwind 4; só apresentação
packages/contracts/    schemas zod de entrada, saída e erro de cada rota; gera o OpenAPI
deploy/helm/           chart do LubyVet (D36)
docker-compose.yml     Postgres, Redis e RabbitMQ para desenvolvimento local
docs/padroes/          padrões de código e de teste
memory/                constituição e decisões
.specify/              specs, planos e tarefas por feature
```

`apps/`, `packages/` e `deploy/` nascem na tarefa de fundação do repositório. Até lá,
existem só os `AGENTS.md` de cada pasta.

## Comandos

| comando | o que faz |
|---|---|
| `./run.sh` | sobe a infra em Docker e a API e o web no host |
| `./run.sh user` | cria ou atualiza um usuário da equipe; login, nome, papel e senha vêm de `LV_*` no ambiente |
| `./run.sh verify` | o mesmo que `bun run verify` |
| `bun run verify` | **o único veredito** (P8): lint, typecheck, unidade, integração, contrato, e2e da API, componentes do web, cobertura por camada, `prisma migrate diff`, regra de fronteira e conferência do OpenAPI |
| `bun run test:unit` | unidade da API e componentes do web; roda em segundos e sem Docker |
| `bun run test:int` | integração com Postgres, Redis e RabbitMQ reais (Testcontainers); precisa de Docker |
| `bun run test:e2e` | API inteira via HTTP e Playwright no web (fluxos e axe nos dois temas, pilha em Testcontainers) |
| `bun run verify:perf` | desempenho da busca de donos (D08); fora do veredito rápido |

Node 24 LTS (`.nvmrc`) e workspaces. **Use o bun para instalar e rodar** (`bun install`, `bun run <script>`): nesta máquina o npm encerra sem erro tanto na instalação quanto em scripts longos ou em vários workspaces. O lockfile versionado é o `bun.lock`.

## Como executar uma tarefa

1. Leia a tarefa em `tasks.md`, o critério que ela satisfaz em `spec.md` e a seção
   correspondente do `plan.md`.
2. Confira se ela toca um item não negociável da constituição. Se tocar, pare e pergunte.
3. Escreva o teste antes quando a constituição pedir (P1: isolamento entre donos) e sempre
   que a tarefa citar um `UT-nnn-n`. Dê ao teste o nome do UT.
4. Implemente o mínimo que deixa o teste verde, respeitando `docs/padroes/`.
5. Rode `bun run verify`. **Só se entrega verde.**
6. Marque o checkbox da tarefa em `tasks.md` no mesmo commit.
7. Faça um commit por tarefa, seguindo `docs/padroes/git.md`.

## Regras que valem em todo arquivo

- Código, identificadores, nomes de arquivo e commits em inglês. Documentação e
  comentários de decisão em português. Todo texto visível ao usuário vem do catálogo de
  tradução (P7).
- Não invente regra de negócio: o que não está numa spec ou em `decisoes.md` vira pergunta.
- Nada se apaga (P2): dado pessoal se anonimiza.
- Animal e visita só se alcançam pelo dono (P1). Não existe busca de animal ou de visita
  por identificador solto, em nenhuma camada.
- O identificador nasce no banco; "novo" é "sem id" (P4).
- Nenhuma credencial em arquivo do repositório, nem em exemplo.
- Rota, campo, envelope e status são contrato (P9) e mudam só com decisão registrada.

## Git

Este diretório tem `.git` próprio. **Confira com `git rev-parse --show-toplevel` antes de
qualquer comando git:** a resposta deve terminar em `/lubyvet`. `~/projects` é outro
repositório e não pode ser tocado.
