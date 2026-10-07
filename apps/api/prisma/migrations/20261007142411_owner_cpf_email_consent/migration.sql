-- AlterTable
ALTER TABLE "owners" ADD COLUMN     "cpf" CHAR(11),
ADD COLUMN     "email" VARCHAR(254),
ADD COLUMN     "messaging_consent_at" TIMESTAMPTZ(3);

-- D15: CPF único só enquanto presente; o dono anonimizado (cpf nulo) libera o valor.
CREATE UNIQUE INDEX "owners_cpf_key" ON "owners" ("cpf") WHERE "cpf" IS NOT NULL;
