-- 012/T003, D51: histórico da dispensa do aviso de dono parecido, uma linha por candidato.
-- CreateTable
CREATE TABLE "owner_similarity_dismissals" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "similar_owner_id" INTEGER NOT NULL,
    "dismissed_by" INTEGER NOT NULL,
    "dismissed_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "owner_similarity_dismissals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "owner_similarity_dismissals_owner_id_dismissed_at_idx" ON "owner_similarity_dismissals"("owner_id", "dismissed_at");

-- AddForeignKey
ALTER TABLE "owner_similarity_dismissals" ADD CONSTRAINT "owner_similarity_dismissals_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_similarity_dismissals" ADD CONSTRAINT "owner_similarity_dismissals_similar_owner_id_fkey" FOREIGN KEY ("similar_owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_similarity_dismissals" ADD CONSTRAINT "owner_similarity_dismissals_dismissed_by_fkey" FOREIGN KEY ("dismissed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- D14/D51: o dono parecido é sempre outro dono; CHECK em SQL cru, declarado em raw-sql-objects.json.
ALTER TABLE "owner_similarity_dismissals" ADD CONSTRAINT "owner_similarity_dismissals_other_owner_check" CHECK ("owner_id" <> "similar_owner_id");
