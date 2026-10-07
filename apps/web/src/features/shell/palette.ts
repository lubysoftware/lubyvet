/**
 * 010/T005, T010, D07: pares de cor nomeados que a interface usa, com o mínimo exigido pelo
 * WCAG 2.2 AA: 4,5 para texto, 3 para componente, borda de campo, foco e ícone.
 */
export const COLOR_PAIRS: { name: string; fg: string; bg: string; min: 4.5 | 3 }[] = [
  { name: 'texto', fg: 'foreground', bg: 'background', min: 4.5 },
  { name: 'texto em cartão', fg: 'foreground', bg: 'surface-raised', min: 4.5 },
  { name: 'texto secundário', fg: 'muted-foreground', bg: 'surface', min: 4.5 },
  { name: 'link', fg: 'primary', bg: 'background', min: 4.5 },
  { name: 'item ativo', fg: 'primary', bg: 'primary-soft', min: 4.5 },
  { name: 'botão primário', fg: 'primary-foreground', bg: 'primary', min: 4.5 },
  { name: 'erro de campo', fg: 'destructive', bg: 'surface-raised', min: 4.5 },
  { name: 'borda de campo', fg: 'input', bg: 'surface-raised', min: 3 },
  { name: 'anel de foco', fg: 'ring', bg: 'background', min: 3 },
  { name: 'destaque (ícone)', fg: 'accent', bg: 'background', min: 3 },
  { name: 'selo agendada', fg: 'status-scheduled-fg', bg: 'status-scheduled-bg', min: 4.5 },
  { name: 'selo realizada', fg: 'status-done-fg', bg: 'status-done-bg', min: 4.5 },
  { name: 'selo cancelada', fg: 'status-cancelled-fg', bg: 'status-cancelled-bg', min: 4.5 },
  { name: 'selo não compareceu', fg: 'status-noshow-fg', bg: 'status-noshow-bg', min: 4.5 },
  { name: 'selo pendente', fg: 'status-pending-fg', bg: 'status-pending-bg', min: 4.5 },
];

const lum = (hex: string): number =>
  [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((a, c, i) => a + c * ([0.2126, 0.7152, 0.0722][i] ?? 0), 0);

export const contrast = (a: string, b: string): number => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** Lê os tokens de um bloco do CSS (":root" ou ":root[data-theme='dark']"). */
export function tokensOf(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [
      m[1] ?? '',
      (m[2] ?? '').toLowerCase(),
    ]),
  );
}

/** Pares reprovados, apontados pelo nome (010/T005). */
export function failingPairs(tokens: Record<string, string>): string[] {
  return COLOR_PAIRS.filter((p) => {
    const fg = tokens[p.fg];
    const bg = tokens[p.bg];
    return !fg || !bg || contrast(fg, bg) < p.min;
  }).map((p) => `${p.name} (${p.fg} sobre ${p.bg})`);
}
