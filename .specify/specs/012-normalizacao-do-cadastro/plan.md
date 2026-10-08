# Plano, Normalização do cadastro

## Stack

Sem mudança (D20, D31 a D35). Nenhuma dependência nova.

## Como não quebrar nada

Tudo o que muda no contrato é aditivo (P9). `telephone`, `address` e `city` continuam com o
mesmo nome e o mesmo significado de antes para quem já os usa; os testes de aceitação de 001 a
011 continuam verdes sem mudar o que verificam. Cada tarefa termina com `bun run verify`.

## Desenho por história

| história | banco | contrato | API | web |
|---|---|---|---|---|
| US-1 | `owner_phones (id, owner_id FK, number varchar(14), position smallint)`, único `(owner_id, number)` e `(owner_id, position)`; CHECK `position between 1 and 4` | `otherPhones: string[]` (máx. 4) na entrada e na saída; regra `normalizeBrazilianPhone` (celular ou fixo) em `rules/phone.ts` | `Owner` guarda `otherPhones`; repositório grava a lista na mesma transação; `findByTelephones(numbers[], exceptId)` procura em `owners.telephone` e em `owner_phones`; anonimização remove as linhas | lista editável no `OwnerEditor` (acrescentar, retirar), telefones na ficha |
| US-2 | colunas `address_number`, `address_complement`, `district`, `state char(2)`, `postal_code char(8)`, nulas; CHECK `owners_state_check` e `owners_postal_code_check` | campos novos na entrada (obrigatórios no registro, menos o complemento; opcionais na alteração) e anuláveis na saída; `BRAZILIAN_STATES` e `normalizePostalCode` em `rules/address.ts` | regras no domínio do dono; anonimização zera os campos novos | campos no editor (UF por `select`), endereço formatado na ficha; dono antigo mostra o texto como estava |
| US-3 | `owner_similarity_dismissals (id, owner_id FK, similar_owner_id FK, dismissed_by FK users, dismissed_at)` | `SimilarityDismissalOutput` | registrar e alterar gravam as linhas na mesma transação; `ListSimilarityDismissals`; rota `GET /api/owners/:ownerId/similarity-dismissals` (Administrador); consistência acrescenta a divergência da data | seção na ficha, só para o Administrador |
| US-4 | `specialties.status` (CHECK ativo ou inativo) e `specialties.version` | `SpecialtyInput`, `ChangeSpecialtyInput`, `AdminSpecialtyOutput` (com `status`, `version`, `vetsCount`); `removeSpecialtyId` em `ChangeVetInput`; código de campo `specialty_inactive` e `specialty_name_taken` | casos de uso de incluir e alterar especialidade; atribuição recusa inativa; retirada do vínculo; invalidação do cache do catálogo | aba "Especialidades" na administração; botão de retirar no veterinário |

## Ordem

US-4 primeiro, porque é a mais isolada (vocabulários). Depois US-3, que só acrescenta tabela e
leitura. US-1 e US-2 mexem no mesmo agregado e no mesmo formulário e vêm por último, uma depois
da outra. A rastreabilidade só exige teste por critério quando todas as tarefas estiverem
marcadas, então a última tarefa fecha a suíte de aceitação.
