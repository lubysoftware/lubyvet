import { expect, test } from '@playwright/test';
import { login } from './support';

/** Os fluxos do balcão de ponta a ponta, na ordem em que a recepção os faz. */
test.describe.serial('balcão: dono, animal, visita e atendimento', () => {
  test('login recusado diz uma mensagem só (007/US-1)', async ({ page }) => {
    await page.goto('/owners');
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('Login').fill('writer@lubyvet.test');
    await page.getByLabel('Senha').fill('errada');
    await page.getByRole('button', { name: 'Entrar' }).click();
    // O Next tem o próprio anunciador de rota com role=alert; a recusa é a que tem texto.
    await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveText(
      'Login ou senha não conferem.',
    );
  });

  test('a recepção cadastra o dono, o animal, agenda e registra o atendimento', async ({ page }) => {
    await login(page, 'writer');
    await page.getByRole('link', { name: 'Cadastrar dono' }).click();
    await page.getByLabel('Nome', { exact: true }).fill('Mariana');
    await page.getByLabel('Sobrenome').fill('Albuquerque');
    await page.getByLabel('Endereço').fill('Rua das Flores, 10');
    await page.getByLabel('Cidade').fill('Campinas');
    await page.getByLabel('Celular').fill('(19) 98765-4321');
    await page.getByLabel('CPF').fill('529.982.247-25');
    await page.getByRole('button', { name: 'Cadastrar dono' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mariana Albuquerque');
    await expect(page.getByRole('status')).toHaveText('Dono gravado');

    await page.getByRole('link', { name: 'Cadastrar animal' }).click();
    await page.getByLabel('Nome do animal').fill('Bidu');
    await page.getByLabel('Data de nascimento').fill('2021-05-06');
    await page.getByLabel('Espécie').selectOption({ label: 'Cão' });
    await page.getByRole('button', { name: 'Salvar animal' }).click();
    await expect(page.getByRole('status')).toHaveText('Animal gravado');
    await expect(page.getByRole('link', { name: /Bidu/ })).toHaveAttribute('aria-current', 'true');

    await page.getByRole('link', { name: 'Agendar visita' }).click();
    await page.getByLabel('Data e hora').fill('2030-01-10T10:30');
    await page.getByLabel('Descrição').fill('Vacina V10');
    await page.getByRole('button', { name: 'Agendar visita' }).click();
    await expect(page.getByRole('status')).toHaveText('Visita agendada');
    const scheduled = page.getByRole('region', { name: 'Visitas agendadas' });
    await expect(scheduled).toContainText('10/01/2030, 10:30');
    await expect(scheduled).toContainText('Agendada');

    await scheduled.getByRole('link', { name: 'Registrar atendimento' }).click();
    await page.getByLabel('Queixa principal').fill('Tosse seca');
    await page.getByLabel('Peso (kg)').fill('12.4');
    await page.getByRole('button', { name: 'Registrar atendimento' }).click();
    await expect(page.getByRole('status')).toHaveText('Atendimento registrado');
    await expect(page.getByRole('region', { name: 'Atendimentos realizados' })).toContainText('Tosse seca');
    await expect(page.getByRole('region', { name: 'Atendimentos realizados' })).toContainText('12,4');
  });

  test('o mesmo celular em outro cadastro pede confirmação (D14)', async ({ page }) => {
    await login(page, 'writer');
    await page.goto('/owners/new');
    await page.getByLabel('Nome', { exact: true }).fill('Marina');
    await page.getByLabel('Sobrenome').fill('Souza');
    await page.getByLabel('Endereço').fill('Rua B, 2');
    await page.getByLabel('Cidade').fill('Campinas');
    await page.getByLabel('Celular').fill('19987654321');
    await page.getByLabel('CPF').fill('111.444.777-35');
    await page.getByRole('button', { name: 'Cadastrar dono' }).click();
    await expect(page.getByRole('link', { name: 'Mariana Albuquerque' })).toBeVisible();
    await page.getByRole('button', { name: 'Gravar mesmo assim' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Marina Souza');
  });

  test('a busca por sobrenome com um resultado abre a ficha (002/T009)', async ({ page }) => {
    await login(page, 'reader');
    await page.getByLabel('Buscar por sobrenome').fill('Albu');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mariana Albuquerque');
  });

  test('Leitura não vê ação de gravar nem a administração (D18)', async ({ page }) => {
    await login(page, 'reader');
    await expect(page.getByRole('link', { name: 'Cadastrar dono' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Administração' })).toHaveCount(0);
    await page.getByRole('link', { name: /Mariana/ }).click();
    await expect(page.getByRole('link', { name: 'Alterar dono' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Agendar visita' })).toHaveCount(0);
    expect((await page.goto('/admin'))?.status()).toBe(404);
  });

  test('o Administrador inclui uma espécie e anonimiza um dono (009, 007/US-3)', async ({ page }) => {
    await login(page, 'admin');
    await page.getByRole('link', { name: 'Administração' }).click();
    await expect(page.getByText('Taxa de não comparecimento')).toBeVisible();
    await page.getByRole('link', { name: 'Espécies' }).click();
    await page.getByLabel('Espécie', { exact: true }).fill('Furão');
    await page.getByRole('button', { name: 'Incluir espécie' }).click();
    await expect(page.getByRole('row', { name: /Furão/ })).toBeVisible();

    await page.goto('/owners?lastName=Souza');
    await page.getByRole('button', { name: 'Anonimizar dono' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Anonimizar dono' }).click();
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Marina Souza');
  });

  test('sair encerra a sessão', async ({ page }) => {
    await login(page, 'writer');
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/owners');
    await expect(page).toHaveURL(/\/login$/);
  });
});
