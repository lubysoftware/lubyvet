-- CreateTable
CREATE TABLE "owner_anonymizations" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "anonymized_at" TIMESTAMPTZ(3) NOT NULL,
    "anonymized_by" INTEGER NOT NULL,
    "pending_spans" JSONB NOT NULL,
    "reviewed_at" TIMESTAMPTZ(3),
    "reviewed_by" INTEGER,

    CONSTRAINT "owner_anonymizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owner_anonymizations_owner_id_key" ON "owner_anonymizations"("owner_id");
