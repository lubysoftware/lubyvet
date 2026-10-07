-- CreateTable
CREATE TABLE "species" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "birth_date" DATE NOT NULL,
    "species_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pets_owner_id_idx" ON "pets"("owner_id");

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 003/T003, P-10: espécie única sem diferenciar maiúsculas.
CREATE UNIQUE INDEX "species_lower_name_key" ON "species" (LOWER("name"));

-- 003/T005, REQ-014, P6: nome de animal único por dono, sem diferenciar maiúsculas, com nome próprio.
CREATE UNIQUE INDEX "pets_owner_id_lower_name_key" ON "pets" ("owner_id", LOWER("name"));

-- 003/T003: o vocabulário inicial de seis espécies do legado, em português.
INSERT INTO "species" ("name", "updated_at") VALUES
  ('Gato', CURRENT_TIMESTAMP),
  ('Cão', CURRENT_TIMESTAMP),
  ('Lagarto', CURRENT_TIMESTAMP),
  ('Cobra', CURRENT_TIMESTAMP),
  ('Ave', CURRENT_TIMESTAMP),
  ('Hamster', CURRENT_TIMESTAMP);
