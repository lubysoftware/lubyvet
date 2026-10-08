import { businessToday } from '@lubyvet/contracts';
import { type Page, expect, test } from '@playwright/test';
import en from '../src/i18n/messages/en.json';
import { expectAccessible, login, validCpf, validMobile } from './support';

/**
 * Critérios de aceite que só se verificam na tela, contra a pilha inteira. Os da API ficam em
 * apps/api/test/acceptance; a rastreabilidade (traceability) exige um teste por critério.
 */
const languageControl = (page: Page) => page.getByRole('combobox', { name: /Idioma|Language/ });

async function ownerWithPet(page: Page, lastName = `Aceite${Date.now() % 100000}`): Promise<string> {
  await page.goto('/owners/new');
  await page.getByLabel('Nome', { exact: true }).fill('Helena');
  await page.getByLabel('Sobrenome').fill(lastName);
  await page.getByLabel('Endereço').fill('Rua C, 3');
  await page.getByLabel('Cidade').fill('Santos');
  await page.getByLabel('Celular').fill(validMobile());
  await page.getByLabel('CPF').fill(validCpf());
  await page.getByRole('button', { name: 'Cadastrar dono' }).click();
  const confirm = page.getByRole('button', { name: 'Gravar mesmo assim' });
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
  await expect(page.getByRole('status')).toHaveText('Dono gravado');
  const record = new URL(page.url()).pathname;
  await page.getByRole('link', { name: 'Cadastrar animal' }).click();
  await page.getByLabel('Nome do animal').fill('Luna');
  await page.getByLabel('Data de nascimento').fill('2022-02-02');
  await page.getByLabel('Espécie').selectOption({ label: 'Gato' });
  await page.getByRole('button', { name: 'Salvar animal' }).click();
  await expect(page.getByRole('status')).toHaveText('Animal gravado');
  return record;
}

test.describe('006 Idioma e comunicação', () => {
  test('006/CA-1.3 sem escolha, a interface sai no idioma padrão', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entrar');
  });

  test('006/CA-1.1 006/CA-3.3 a escolha vale para a interface inteira e para as requisições seguintes', async ({
    page,
  }) => {
    await page.goto('/login');
    await languageControl(page).selectOption('en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.login.title);
    await expect(languageControl(page)).toHaveValue('en');
    await page.getByLabel('Login').fill('writer@lubyvet.test');
    await page.getByLabel('Password').fill('senha-de-teste-123');
    await page.getByRole('button', { name: en.login.submit }).click();
    await expect(page.getByRole('link', { name: en.nav.owners })).toBeVisible();
    await page.goto('/vets');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.nav.vets);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('006/CA-1.2 idioma não suportado recai no padrão, sem erro', async ({ page }) => {
    await page.context().addCookies([{ name: 'lv_locale', value: 'fr', url: 'http://localhost:3100' }]);
    const res = await page.goto('/login');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entrar');
  });

  test('006/CA-2.1 com o idioma trocado, erro e confirmação de gravação saem nele', async ({ page }) => {
    await login(page, 'writer');
    await languageControl(page).selectOption('en');
    await page.goto('/owners/new');
    await page.getByRole('button', { name: 'Register owner' }).click();
    await expect(page.getByLabel('CPF')).toHaveAccessibleDescription(en.fields.required);
    await page.getByLabel('First name').fill('Owen');
    await page.getByLabel('Last name').fill(`English${Date.now() % 100000}`);
    await page.getByLabel('Address').fill('1 Main St');
    await page.getByLabel('City').fill('Santos');
    await page.getByLabel('Mobile').fill(validMobile());
    await page.getByLabel('CPF').fill(validCpf());
    await page.getByRole('button', { name: 'Register owner' }).click();
    const confirm = page.getByRole('button', { name: en.owners.saveAnyway });
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
    await expect(page.getByRole('status')).toHaveText(en.result.ownerSaved);
  });

  test('006/CA-2.2 nenhum rótulo de formulário fica no idioma padrão quando o idioma é outro', async ({
    page,
  }) => {
    await login(page, 'writer');
    await languageControl(page).selectOption('en');
    await page.goto('/owners/new');
    const labels = await page.locator('main label').allTextContents();
    const english = new Set(Object.values(en.owners));
    expect(labels.filter((l) => !english.has(l.trim()))).toEqual([]);
  });

  test('006/CA-3.1 o controle de idioma está em todas as telas, inclusive na de erro (P-04)', async ({
    page,
  }) => {
    for (const path of ['/login', '/does-not-exist']) {
      await page.goto(path);
      await expect(languageControl(page)).toBeVisible();
    }
    await login(page, 'admin');
    for (const path of ['/owners', '/owners/new', '/vets', '/admin', '/owners/999999']) {
      await page.goto(path);
      await expect(languageControl(page)).toBeVisible();
      await expect(languageControl(page).locator('option')).toHaveText(['Português', 'English']);
    }
  });

  test('006/CA-3.2 trocar pelo endereço tem o mesmo efeito que trocar pelo controle', async ({ page }) => {
    await page.goto('/login?lang=en');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.login.title);
    await expect(languageControl(page)).toHaveValue('en');
    const cookie = (await page.context().cookies()).find((c) => c.name === 'lv_locale');
    expect(cookie?.value).toBe('en');
  });
});

test.describe('001, 008 e 010 na tela', () => {
  test('001/CA-6.3 001/CA-7.1 a ficha oferece os atalhos e a confirmação aparece na própria gravação', async ({
    page,
  }) => {
    await login(page, 'writer');
    const record = await ownerWithPet(page);
    await page.goto(record);
    for (const name of ['Alterar dono', 'Cadastrar animal', 'Alterar animal', 'Agendar visita'])
      await expect(page.getByRole('link', { name })).toBeVisible();
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('001/CA-7.2 o erro de gravação aparece junto ao formulário que o produziu', async ({ page }) => {
    await login(page, 'writer');
    await page.goto('/owners/new');
    await page.getByLabel('CPF').fill('123.456.789-00');
    await page.getByRole('button', { name: 'Cadastrar dono' }).click();
    await expect(page.getByLabel('CPF')).toHaveAccessibleDescription('CPF inválido.');
    await expect(page.getByLabel('CPF')).toHaveValue('123.456.789-00');
  });

  test('001/CA-7.3 a mensagem de resultado some sozinha depois do tempo definido', async ({ page }) => {
    test.setTimeout(20_000);
    await login(page, 'writer');
    await ownerWithPet(page);
    await expect(page.getByRole('status')).toHaveCount(0, { timeout: 7_000 });
  });

  test('008/CA-1.1 dono inexistente responde página amigável de não encontrado', async ({ page }) => {
    await login(page, 'reader');
    const res = await page.goto('/owners/999999');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página não encontrada');
    expect(await page.content()).not.toMatch(/at \w+ \(|Error:|stack/i);
  });

  test('008/CA-6.2 nenhum item do menu leva a erro', async ({ page }) => {
    await login(page, 'admin');
    const hrefs = await page
      .getByRole('navigation', { name: 'Menu principal' })
      .first()
      .getByRole('link')
      .evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    for (const href of hrefs) expect((await page.goto(href ?? '/'))?.status()).toBe(200);
  });

  test('010/CA-3.2 o erro de campo não depende só de cor: tem texto, estado e borda mais grossa', async ({
    page,
  }) => {
    await login(page, 'writer');
    await page.goto('/owners/new');
    const before = await page.getByLabel('Cidade').evaluate((e) => getComputedStyle(e).borderTopWidth);
    await page.getByRole('button', { name: 'Cadastrar dono' }).click();
    const city = page.getByLabel('Cidade');
    await expect(city).toHaveAttribute('aria-invalid', 'true');
    await expect(city).toHaveAccessibleDescription('Preencha este campo.');
    expect(before).toBe('1px');
    expect(await city.evaluate((e) => getComputedStyle(e).borderTopWidth)).toBe('2px');
  });
});

test.describe('002 e 004 na tela', () => {
  test('002/CA-1.4 busca sem resultado volta ao formulário com erro no campo, sem lista vazia', async ({
    page,
  }) => {
    await login(page, 'reader');
    await page.getByLabel('Buscar por sobrenome').fill('Zzqxw');
    await page.getByRole('button', { name: 'Buscar' }).click();
    const field = page.getByLabel('Buscar por sobrenome');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription('Nenhum dono com esse sobrenome.');
    await expect(field).toHaveValue('Zzqxw');
    await expect(page.getByRole('row')).toHaveCount(1);
  });

  test('002/CA-3.1 002/CA-3.3 um resultado só abre a ficha direto, sem mensagem de gravação', async ({
    page,
  }) => {
    await login(page, 'writer');
    const lastName = `Unico${Date.now() % 100000}`;
    const record = await ownerWithPet(page, lastName);
    await page.goto(`/owners?lastName=${lastName}`);
    await expect(page).toHaveURL(new RegExp(`${record}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Helena ${lastName}`);
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('004/CA-1.4 o agendamento abre com a data de amanhã sugerida e o campo limitado a partir de agora', async ({
    page,
  }) => {
    await login(page, 'writer');
    await ownerWithPet(page);
    await page.getByRole('link', { name: 'Agendar visita' }).click();
    const when = page.getByLabel('Data e hora');
    const today = businessToday(new Date());
    const tomorrow = businessToday(new Date(Date.now() + 86_400_000));
    expect((await when.inputValue()).slice(0, 10)).toBe(tomorrow);
    expect(((await when.getAttribute('min')) ?? '').slice(0, 10)).toBe(today);
    await when.fill('2020-01-01T10:00');
    await page.getByLabel('Descrição').fill('Vacina');
    await page.getByRole('button', { name: 'Agendar visita' }).click();
    await expect(when).toHaveAccessibleDescription('A data precisa ser futura.');
  });
});

test.describe('012 na tela', () => {
  test('012/CA-4.7 a administração inclui, renomeia, inativa e reativa especialidade, e retira do veterinário', async ({
    page,
  }) => {
    const n = Date.now() % 100000;
    const first = `Dermato${n}`;
    const renamed = `Dermatologia ${n}`;
    const tab = (name: string) =>
      page.getByRole('navigation', { name: 'Seções da administração' }).getByRole('link', { name }).click();
    await login(page, 'admin');
    await page.goto('/admin');
    await tab('Especialidades');
    await page.getByLabel('Especialidade', { exact: true }).fill(first);
    await page.getByRole('button', { name: 'Incluir especialidade' }).click();
    await expect(page.getByRole('row', { name: new RegExp(first) })).toBeVisible();

    await page.getByRole('button', { name: `Renomear ${first}` }).click();
    await page.getByLabel(`Novo nome de ${first}`).fill(renamed);
    await page.getByRole('button', { name: 'Salvar nome' }).click();
    await expect(page.getByRole('row', { name: new RegExp(renamed) })).toBeVisible();
    await expectAccessible(page);

    await tab('Veterinários');
    await page.getByLabel('Nome', { exact: true }).fill('Paula');
    await page.getByLabel('Sobrenome').fill(`Ramos${n}`);
    await page.getByRole('checkbox', { name: renamed }).check();
    await page.getByRole('button', { name: 'Incluir veterinário' }).click();
    const remove = page.getByRole('button', { name: `Retirar ${renamed} de Paula Ramos${n}` });
    await expect(remove).toBeVisible();
    await expectAccessible(page);
    await remove.click();
    await expect(remove).toHaveCount(0);

    await tab('Especialidades');
    await page.getByRole('button', { name: `Inativar ${renamed}` }).click();
    await expect(page.getByRole('row', { name: new RegExp(renamed) })).toContainText('Inativa');
    await tab('Veterinários');
    await expect(page.getByRole('row', { name: new RegExp(`Ramos${n}`) })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: renamed })).toHaveCount(0);

    await tab('Especialidades');
    await page.getByRole('button', { name: `Reativar ${renamed}` }).click();
    await expect(page.getByRole('row', { name: new RegExp(renamed) })).toContainText('Ativa');
  });
});
