-- 012/T001, D52: a especialidade ganha situação e versão, como a espécie (P-10).
-- AlterTable
ALTER TABLE "specialties" ADD COLUMN     "status" VARCHAR(10) NOT NULL DEFAULT 'active',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- D52: especialidade Ativa ou Inativa; CHECK em SQL cru, declarado em raw-sql-objects.json.
ALTER TABLE "specialties" ADD CONSTRAINT "specialties_status_check" CHECK ("status" IN ('active', 'inactive'));
