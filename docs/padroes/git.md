# Git e commits

## Antes de qualquer comando

```bash
git rev-parse --show-toplevel   # precisa terminar em /lubyvet
```

`~/projects` é outro repositório, com milhares de deleções pendentes. Nunca rode `add`,
`commit`, `checkout` ou `restore` de lá.

## Uma tarefa, um commit

- Cada tarefa de `tasks.md` vira um commit atômico, com o checkbox marcado no mesmo commit.
- Só se commita verde: `bun run verify` passa antes (P8).
- Branch por feature: `feat/001-gestao-de-donos`. Correção fora de feature: `fix/<assunto>`.

## Mensagem (D43: em inglês)

Conventional Commits, em inglês, com o escopo do módulo e a referência da tarefa no fim do
título:

```
feat(owners): reject duplicate CPF with field error (001/T019)

CPF is unique only while present (D15), so an anonymized owner frees the value.
The unique violation is mapped by constraint name, never by message text (P6).
```

- Tipos: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `build`, `ci`, `perf`.
- Escopos: os módulos (`owners`, `pets`, `visits`, `vets`, `vocabularies`, `identity`,
  `notifications`, `operations`), `web`, `contracts`, `deploy`, `specs`.
- O corpo explica o porquê e cita a decisão ou o princípio (D15, P6), não repete o diff.
- A skill `conventional-commit` e o subagent `revisor-de-codigo` existem para isso: use os
  dois antes de fechar.
