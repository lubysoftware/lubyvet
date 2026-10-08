# Banco e migrações

PostgreSQL é o único dialeto (P5, D20). O schema muda só por migração versionada do Prisma
Migrate (D33), no mesmo commit da mudança de modelo.

## Nomes (P3)

- Tabelas e colunas em `snake_case` no banco, `camelCase` no Prisma, com `@@map` e `@map`
  **em todo modelo e em todo campo**, mesmo quando o nome coincide. Nada depende de
  convenção automática.
- Chave estrangeira: `<entidade>_id` (`owner_id`, `pet_id`).
- Restrição com nome explícito: `owners_cpf_key`, `pets_owner_id_lower_name_key`. O
  adaptador traduz o erro `P2002` pelo nome da restrição para o erro de domínio (P6).

## Colunas que toda tabela de negócio tem

| coluna | tipo | regra |
|---|---|---|
| `id` | `integer`, gerado pelo banco | P4: a aplicação nunca atribui |
| `version` | `integer`, padrão 0 | concorrência otimista: `UPDATE … WHERE id = $1 AND version = $2`; zero linhas afetadas significa `StaleVersion` |
| `created_at`, `updated_at` | `timestamptz` | P2 |
| `created_by`, `updated_by` | `integer`, referência a `users` | D02 |

## O que o Prisma não declara

Vai em SQL cru, dentro da migração gerada, com comentário citando a origem:

```sql
-- P6/REQ-014: nome de animal único por dono, sem diferenciar maiúsculas
CREATE UNIQUE INDEX "pets_owner_id_lower_name_key" ON "pets" ("owner_id", LOWER("name"));

-- D15: CPF único só enquanto presente; o dono anonimizado libera o valor
CREATE UNIQUE INDEX "owners_cpf_key" ON "owners" ("cpf") WHERE "cpf" IS NOT NULL;
```

Cada um desses índices tem um teste de integração que tenta violá-lo.

## Limites

O limite de tamanho existe nos dois lados com o mesmo número (P3): `VARCHAR(30)` no banco
e `.max(OWNER_LIMITS.firstName)` no contrato, os dois lidos da mesma constante. Coluna de
texto sem limite (`TEXT`) só quando a spec não define limite, como o diagnóstico do
atendimento (D26 define 2000, então ali é `VARCHAR(2000)`).

## Nada se apaga (P2)

- Nenhum `DELETE` em tabela de negócio, e nenhum `onDelete: Cascade` no schema. Toda relação
  declara `onDelete: Restrict`.
- Anonimizar é um `UPDATE` que troca os campos identificáveis por nulo ou marcador, muda
  `updated_at` e grava quem fez (D24, D25).

## Migrações

- `prisma migrate dev --name <descricao_em_ingles>` no desenvolvimento; `prisma migrate
  deploy` na CI, nos testes e no cluster.
- Migração já aplicada nunca é editada. Corrigiu, é migração nova.
- `prisma migrate diff` roda no `verify` e falha se o schema e as migrações divergirem.
- Dados de exemplo para desenvolvimento ficam em `apps/api/prisma/seed.ts`, sintéticos, e
  nunca rodam em produção.

## Integridade garantida pelo banco (08/10/2026)

O banco recusa sozinho o que antes só a aplicação impedia; a regra mora na aplicação e o banco é
a última linha:

- **Toda coluna de relacionamento tem chave estrangeira**, inclusive autoria (`created_by`,
  `updated_by` → `users`), anonimização e caixa de saída. Todas com `ON DELETE RESTRICT` (P2).
- **Atendimento só se liga a agendamento do mesmo animal (P1):** chave estrangeira composta
  `encounters (appointment_id, pet_id) → appointments (id, pet_id)`.
- **Domínios fechados por CHECK:** situações, papéis, tipos de mensagem, login em minúsculas,
  peso de D26 e versões não negativas. O `schema.prisma` não declara CHECK, então cada uma está em
  `prisma/raw-sql-objects.json`, e o teste de divergência confere que existe no banco migrado.
- **Duas redundâncias de propósito:** a situação do agendamento está na coluna e é também a
  última linha do histórico; "Realizada" equivale a ter atendimento ligado. As duas ficam por
  desempenho de leitura e são vigiadas pela consulta `test/support/consistency.ts`, que o teste
  de aceitação da 004 roda depois dos fluxos e que serve à operação para auditar o banco.
