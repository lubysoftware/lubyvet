import type { AuthorshipOutput, OwnerOutput, OwnerRecordOutput } from '@lubyvet/contracts';
import { useFormatter, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { SpeciesIcon } from '@/features/shell/components/species-icon';
import { dateOnly, formatCpf, formatPhone } from '@/lib/format';
import { ownerRecordUrl } from '@/lib/url-state';

type Pet = OwnerRecordOutput['pets'][number];

/** Dado rotulado do bloco de contato: rótulo em `label`, valor em `data` quando é número. */
function Item({ label, children, data }: { label: string; children: ReactNode; data?: boolean }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={data ? 'tabular' : undefined}>{children}</dd>
    </div>
  );
}

/** 001/US-6: o bloco de contato do dono e a autoria do cadastro (007/US-4). */
export function OwnerContact({ owner, authorship }: { owner: OwnerOutput; authorship: AuthorshipOutput }) {
  const t = useTranslations('owners');
  const format = useFormatter();
  const when = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'short', timeStyle: 'short' });
  return (
    <section
      aria-labelledby="h-contact"
      className="grid gap-4 rounded-md border border-border bg-surface p-4"
    >
      <h2 id="h-contact" className="text-lg font-semibold">
        {t('contact')}
      </h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Item label={t('address')}>{owner.address}</Item>
        <Item label={t('city')}>{owner.city}</Item>
        <Item label={t('telephone')} data>
          {formatPhone(owner.telephone)}
        </Item>
        <Item label={t('cpf')} data>
          {formatCpf(owner.cpf)}
        </Item>
        <Item label={t('email')}>{owner.email ?? t('none')}</Item>
        <Item label={t('messaging')}>
          {owner.messagingConsentAt ? t('consentGiven') : t('consentMissing')}
        </Item>
      </dl>
      <p className="text-sm text-muted-foreground">
        {t('createdBy', {
          name: authorship.createdBy?.name ?? t('system'),
          when: when(authorship.createdAt),
        })}
        {' · '}
        {t('updatedBy', {
          name: authorship.updatedBy?.name ?? t('system'),
          when: when(authorship.updatedAt),
        })}
      </p>
    </section>
  );
}

/** Animais do dono em ordem alfabética (001/US-6); o escolhido fica na URL (?pet=). */
export function PetList({
  ownerId,
  pets,
  selected,
}: {
  ownerId: number;
  pets: Pet[];
  selected: number | null;
}) {
  const t = useTranslations();
  const format = useFormatter();
  if (pets.length === 0) return <p className="text-muted-foreground">{t('pets.empty')}</p>;
  return (
    <ul className="grid gap-2" aria-label={t('owners.pets')}>
      {pets.map((p) => (
        <li key={p.id}>
          <a
            href={ownerRecordUrl(`/owners/${ownerId}`, { pet: p.id })}
            aria-current={p.id === selected ? 'true' : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-md border border-border px-3 py-2 ${
              p.id === selected ? 'bg-primary-soft text-primary' : 'bg-surface-raised'
            }`}
          >
            <SpeciesIcon species={p.species.name} decorative />
            <span className="grid">
              <span className="font-semibold">{p.name}</span>
              <span className="text-sm text-muted-foreground">
                {p.species.name} ·{' '}
                <span className="tabular">
                  {format.dateTime(dateOnly(p.birthDate), { dateStyle: 'short', timeZone: 'UTC' })}
                </span>
                {p.status !== 'active' && ` · ${t(`petStatus.${p.status as 'deceased'}`)}`}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
