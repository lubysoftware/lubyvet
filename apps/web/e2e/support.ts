import { type Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Senha sintética dos usuários de teste, a mesma da suíte da API; não vale fora dos containers. */
export const PASSWORD = 'senha-de-teste-123';
export const USERS = {
  admin: { name: 'Ana Admin', login: 'admin@lubyvet.test', role: 'admin' },
  writer: { name: 'Carla Escrita', login: 'writer@lubyvet.test', role: 'writer' },
  reader: { name: 'Rui Leitura', login: 'reader@lubyvet.test', role: 'reader' },
} as const;
export type Who = keyof typeof USERS;

export async function login(page: Page, who: Who): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Login').fill(USERS[who].login);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/owners$/);
  // O login navega por window.location; só segue depois que a lista carregou, para a próxima
  // navegação do teste não ser interrompida por esta.
  await expect(page.getByLabel('Buscar por sobrenome')).toBeVisible();
  await page.waitForLoadState('load');
}

/** D38: o tema vai no mesmo cookie que a troca de tema grava. */
export async function useTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.context().addCookies([{ name: 'lv_theme', value: theme, url: 'http://localhost:3100' }]);
}

/** D07: WCAG 2.2 AA, sem exceção, na página como ela está. */
export async function expectAccessible(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}

let seq = Date.now() % 1_000_000;
/** CPF sintético com dígitos verificadores válidos (nunca dado real), um por chamada. */
export function validCpf(): string {
  const base = String(100_000_000 + ((++seq * 7919) % 899_999_999)).slice(0, 9);
  const dv = (digits: string, start: number) => {
    const rest = ([...digits].reduce((acc, d, i) => acc + Number(d) * (start - i), 0) * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const d1 = dv(base, 10);
  return `${base}${d1}${dv(base + d1, 11)}`;
}
/** Celular sintético válido (D05), um por chamada. */
export const validMobile = (): string =>
  `(13) 9${String(10_000_000 + ((++seq * 104_729) % 89_999_999)).slice(0, 8)}`;
