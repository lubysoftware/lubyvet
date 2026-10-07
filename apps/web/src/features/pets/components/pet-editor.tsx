'use client';

import {
  ChangePetInput,
  PET_STATUS,
  type PetOutput,
  RegisterPetInput,
  type SpeciesOutput,
} from '@lubyvet/contracts';
import { useTranslations } from 'next-intl';
import type { z } from 'zod';
import { FailureMessage } from '@/components/ui/failure-message';
import { apiSend } from '@/lib/api-client';
import { optionalNumber } from '@/features/forms/form-values';
import { PetForm } from '@/features/forms/components/forms';
import { useApiForm } from '@/features/forms/use-api-form';
import { ownerRecordUrl } from '@/lib/url-state';

/** P-10: a espécie vai pelo identificador; o select entrega texto e o contrato pede número. */
export function petInput(raw: Record<string, string>, version?: number) {
  const base = { name: raw.name, birthDate: raw.birthDate, speciesId: optionalNumber(raw.speciesId) };
  return version === undefined ? base : { ...base, version, status: raw.status };
}

/**
 * 003/US-1 e US-3: cadastro e alteração do animal, sempre pelo dono (P1). Na alteração, a
 * espécie atual continua na lista mesmo inativa, para o animal antigo não perder o valor.
 */
export function PetEditor({
  ownerId,
  species,
  pet,
}: {
  ownerId: number;
  species: SpeciesOutput[];
  pet?: PetOutput;
}) {
  const t = useTranslations();
  const form = useApiForm(
    (pet ? ChangePetInput : RegisterPetInput) as z.ZodType<Record<string, unknown>>,
    (input, key) =>
      pet
        ? apiSend<PetOutput>('PATCH', `/api/owners/${ownerId}/pets/${pet.id}`, input, key)
        : apiSend<PetOutput>('POST', `/api/owners/${ownerId}/pets`, input, key),
    (saved) =>
      window.location.assign(ownerRecordUrl(`/owners/${ownerId}`, { pet: saved.id, saved: 'petSaved' })),
  );
  const options = [...species];
  if (pet && !options.some((s) => s.id === pet.species.id)) options.push(pet.species);
  return (
    <div className="grid gap-4">
      <FailureMessage failure={form.failure} />
      <PetForm
        errors={form.errors}
        pending={form.pending}
        species={options.map((s) => ({ value: String(s.id), label: s.name }))}
        statuses={pet && PET_STATUS.map((s) => ({ value: s, label: t(`petStatus.${s}`) }))}
        defaults={
          pet && {
            name: pet.name,
            birthDate: pet.birthDate,
            speciesId: String(pet.species.id),
            status: pet.status,
          }
        }
        onSubmit={(raw) => void form.submit(petInput(raw, pet?.version))}
      />
    </div>
  );
}
