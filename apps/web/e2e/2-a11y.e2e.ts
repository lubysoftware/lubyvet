import { expect, test } from '@playwright/test';
import { expectAccessible, login, useTheme } from './support';

/**
 * D07 e D38: toda tela passa no axe (WCAG 2.2 AA) no tema claro e no escuro. Roda depois dos
 * fluxos, que deixam um dono com animal, visita agendada e atendimento.
 */
for (const theme of ['light', 'dark'] as const) {
  test.describe(`acessibilidade no tema ${theme === 'light' ? 'claro' : 'escuro'}`, () => {
    test.beforeEach(async ({ page }) => useTheme(page, theme));

    test('login', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expectAccessible(page);
    });

    test('010/CA-2.1 011/CA-5.4 telas da equipe passam no WCAG 2.2 AA', async ({ page }) => {
      await login(page, 'admin');
      await page.goto('/owners?lastName=');
      const record = await page.getByRole('link', { name: /Mariana/ }).getAttribute('href');
      const screens = [
        '/owners?lastName=',
        '/owners/new',
        `${record}`,
        `${record}/edit`,
        `${record}/pets/new`,
        '/vets',
        '/admin',
        '/admin?tab=species',
        '/admin?tab=specialties',
        '/admin?tab=vets',
      ];
      for (const path of screens) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expectAccessible(page);
      }
      await page.goto(`${record}`);
      await page.getByRole('link', { name: 'Agendar visita' }).click();
      await expectAccessible(page);
      await page.goto(`${record}`);
      await page.getByRole('link', { name: 'Registrar atendimento' }).first().click();
      await expectAccessible(page);
    });

    test('010/CA-3.2 formulário com erro marcado continua acessível', async ({ page }) => {
      await login(page, 'writer');
      await page.goto('/owners/new');
      await page.getByRole('button', { name: 'Cadastrar dono' }).click();
      await expect(page.getByLabel('CPF')).toHaveAttribute('aria-invalid', 'true');
      await expectAccessible(page);
    });
  });
}

test('sem escolha de tema, vale a preferência do aparelho (D38)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/login');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  // #0e1a18, o background do tema escuro.
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(14, 26, 24)');
  await expectAccessible(page);
});

test('no celular nenhuma tela rola para o lado (design system: casca)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'admin');
  for (const path of [
    '/owners?lastName=',
    '/vets',
    '/admin',
    '/admin?tab=species',
    '/admin?tab=specialties',
  ]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  }
});
