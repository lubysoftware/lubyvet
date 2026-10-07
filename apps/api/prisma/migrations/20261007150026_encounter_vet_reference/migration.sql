-- CreateIndex
CREATE INDEX "encounters_vet_id_idx" ON "encounters"("vet_id");

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_vet_id_fkey" FOREIGN KEY ("vet_id") REFERENCES "vets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
