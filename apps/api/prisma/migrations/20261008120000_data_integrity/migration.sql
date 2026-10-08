-- 012: integridade de dados. Chaves estrangeiras que faltavam (autoria, anonimização, caixa de saída),
-- atendimento ligado só a agendamento do mesmo animal (P1) e domínios fechados por CHECK.
-- DropForeignKey
ALTER TABLE "encounters" DROP CONSTRAINT "encounters_appointment_id_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "appointments_id_pet_id_key" ON "appointments"("id", "pet_id");

-- CreateIndex
CREATE UNIQUE INDEX "encounters_appointment_id_pet_id_key" ON "encounters"("appointment_id", "pet_id");

-- AddForeignKey
ALTER TABLE "owners" ADD CONSTRAINT "owners_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owners" ADD CONSTRAINT "owners_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_appointment_id_fkey" FOREIGN KEY ("appointment_id", "pet_id") REFERENCES "appointments"("id", "pet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_anonymizations" ADD CONSTRAINT "owner_anonymizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_anonymizations" ADD CONSTRAINT "owner_anonymizations_anonymized_by_fkey" FOREIGN KEY ("anonymized_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_anonymizations" ADD CONSTRAINT "owner_anonymizations_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Domínios fechados (D09, D10, D18, P-09, P-10, D12) e limites (D26, P-15): CHECK em SQL cru,
-- declarado em raw-sql-objects.json, porque o schema.prisma não declara CHECK.
ALTER TABLE "pets" ADD CONSTRAINT "pets_status_check" CHECK ("status" IN ('active', 'deceased', 'transferred'));
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_status_check" CHECK ("status" IN ('scheduled', 'done', 'cancelled', 'no_show'));
ALTER TABLE "appointment_status_changes" ADD CONSTRAINT "appointment_status_changes_status_check" CHECK ("to_status" IN ('scheduled', 'done', 'cancelled', 'no_show') AND ("from_status" IS NULL OR "from_status" IN ('scheduled', 'done', 'cancelled', 'no_show')));
ALTER TABLE "species" ADD CONSTRAINT "species_status_check" CHECK ("status" IN ('active', 'inactive'));
ALTER TABLE "vets" ADD CONSTRAINT "vets_status_check" CHECK ("status" IN ('active', 'dismissed'));
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("role" IN ('reader', 'writer', 'admin'));
ALTER TABLE "users" ADD CONSTRAINT "users_status_check" CHECK ("status" IN ('active', 'inactive'));
ALTER TABLE "users" ADD CONSTRAINT "users_failed_attempts_check" CHECK ("failed_attempts" >= 0);
ALTER TABLE "users" ADD CONSTRAINT "users_login_lower_check" CHECK ("login" = lower("login"));
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_status_check" CHECK ("status" IN ('pending', 'published', 'sent', 'skipped', 'failed'));
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_kind_check" CHECK ("kind" IN ('confirmation', 'reminder'));
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_attempts_check" CHECK ("attempts" >= 0);
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_weight_kg_check" CHECK ("weight_kg" IS NULL OR "weight_kg" BETWEEN 0.01 AND 999.99);
ALTER TABLE "owners" ADD CONSTRAINT "owners_version_check" CHECK ("version" >= 0);
ALTER TABLE "pets" ADD CONSTRAINT "pets_version_check" CHECK ("version" >= 0);
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_version_check" CHECK ("version" >= 0);
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_version_check" CHECK ("version" >= 0);
