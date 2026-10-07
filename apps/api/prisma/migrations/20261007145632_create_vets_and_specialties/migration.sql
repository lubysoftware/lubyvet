-- CreateTable
CREATE TABLE "vets" (
    "id" SERIAL NOT NULL,
    "first_name" VARCHAR(30) NOT NULL,
    "last_name" VARCHAR(30) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialties" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vet_specialties" (
    "vet_id" INTEGER NOT NULL,
    "specialty_id" INTEGER NOT NULL,

    CONSTRAINT "vet_specialties_pkey" PRIMARY KEY ("vet_id","specialty_id")
);

-- AddForeignKey
ALTER TABLE "vet_specialties" ADD CONSTRAINT "vet_specialties_vet_id_fkey" FOREIGN KEY ("vet_id") REFERENCES "vets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vet_specialties" ADD CONSTRAINT "vet_specialties_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 005: especialidades iniciais do legado, em português; nome único sem diferenciar maiúsculas.
CREATE UNIQUE INDEX "specialties_lower_name_key" ON "specialties" (LOWER("name"));
INSERT INTO "specialties" ("name", "updated_at") VALUES ('Radiologia', CURRENT_TIMESTAMP), ('Cirurgia', CURRENT_TIMESTAMP), ('Odontologia', CURRENT_TIMESTAMP);
