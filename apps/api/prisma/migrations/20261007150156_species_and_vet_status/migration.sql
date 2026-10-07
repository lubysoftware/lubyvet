-- AlterTable
ALTER TABLE "species" ADD COLUMN     "status" VARCHAR(10) NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "vets" ADD COLUMN     "status" VARCHAR(10) NOT NULL DEFAULT 'active';
