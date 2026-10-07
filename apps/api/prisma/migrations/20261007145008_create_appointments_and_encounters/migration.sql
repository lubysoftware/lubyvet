-- CreateTable
CREATE TABLE "appointments" (
    "id" SERIAL NOT NULL,
    "pet_id" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMPTZ(3) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "status" VARCHAR(12) NOT NULL DEFAULT 'scheduled',
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_status_changes" (
    "id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "from_status" VARCHAR(12),
    "to_status" VARCHAR(12) NOT NULL,
    "changed_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "appointment_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounters" (
    "id" SERIAL NOT NULL,
    "pet_id" INTEGER NOT NULL,
    "appointment_id" INTEGER,
    "date" DATE NOT NULL,
    "chief_complaint" VARCHAR(500) NOT NULL,
    "weight_kg" DECIMAL(5,2),
    "diagnosis" VARCHAR(2000),
    "conduct" VARCHAR(2000),
    "return_date" DATE,
    "vet_id" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointments_pet_id_scheduled_at_idx" ON "appointments"("pet_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "appointment_status_changes_appointment_id_idx" ON "appointment_status_changes"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "encounters_appointment_id_key" ON "encounters"("appointment_id");

-- CreateIndex
CREATE INDEX "encounters_pet_id_date_idx" ON "encounters"("pet_id", "date");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_status_changes" ADD CONSTRAINT "appointment_status_changes_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
