-- DropIndex
DROP INDEX "owners_last_name_idx";

-- 002/T004: a busca compara o sobrenome sem diferenciar maiúsculas; o índice cobre a forma
-- normalizada e o prefixo (text_pattern_ops), igual em qualquer collation (P5).
CREATE INDEX "owners_lower_last_name_idx" ON "owners" (LOWER("last_name") text_pattern_ops);
