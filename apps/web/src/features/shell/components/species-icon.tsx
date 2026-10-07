import { Bird, Cat, Dog, Fish, PawPrint, Rabbit, type LucideIcon } from 'lucide-react';

/** D41: ícones Lucide de espécie; espécie sem ícone próprio usa a pata. Sempre com rótulo. */
const BY_NAME: Record<string, LucideIcon> = {
  cao: Dog,
  cachorro: Dog,
  gato: Cat,
  ave: Bird,
  coelho: Rabbit,
  peixe: Fish,
};
const key = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Ao lado do nome da espécie escrito, o ícone é decorativo e sai da leitura de tela. */
export function SpeciesIcon({ species, decorative }: { species: string; decorative?: boolean }) {
  const Icon = BY_NAME[key(species)] ?? PawPrint;
  if (decorative) return <Icon aria-hidden size={18} strokeWidth={2} />;
  return <Icon role="img" aria-label={species} size={18} strokeWidth={2} />;
}
