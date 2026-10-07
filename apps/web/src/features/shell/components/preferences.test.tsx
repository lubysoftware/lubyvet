import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/render';
import { resolveTheme } from '../theme';
import { Preferences } from './preferences';

describe('troca de idioma e de tema (006/T010, 010/T011)', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost/', reload: vi.fn() },
      writable: true,
    });
  });

  it('a troca de idioma grava o mesmo cookie que a resolução lê, e recarrega', async () => {
    renderWithIntl(<Preferences />);
    await userEvent.selectOptions(screen.getByLabelText('Idioma'), 'en');
    expect(document.cookie).toContain('lv_locale=en');
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('a troca de tema oferece claro, escuro e sistema e grava o cookie (D38)', async () => {
    renderWithIntl(<Preferences />, 'en');
    await userEvent.selectOptions(screen.getByLabelText('Theme'), 'dark');
    expect(document.cookie).toContain('lv_theme=dark');
    expect([resolveTheme('dark'), resolveTheme('x')]).toEqual(['dark', 'system']);
  });
});
