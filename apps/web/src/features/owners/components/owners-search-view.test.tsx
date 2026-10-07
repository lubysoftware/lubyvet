import { screen } from '@testing-library/react';
import { renderWithIntl } from '@/test/render';
import { OwnersSearchView, pageHref, singleResultTarget } from './owners-search-view';

const owner = (id: number) => ({
  id,
  firstName: 'Ana',
  lastName: `Lima${id}`,
  address: 'R',
  city: 'SP',
  telephone: '+5511987654321',
  petNames: ['Thor'],
});
const page = (over = {}) => ({
  items: [owner(1), owner(2)],
  page: 1,
  pageSize: 5,
  total: 7,
  lastName: 'Lima',
  ...over,
});

describe('busca de donos (002)', () => {
  it('T003: sem resultado, o campo volta marcado com a mensagem do catálogo', () => {
    renderWithIntl(<OwnersSearchView data={page({ items: [], total: 0, lastName: 'Zz' })} />);
    expect(screen.getByLabelText('Buscar por sobrenome')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Nenhum dono com esse sobrenome.')).toBeInTheDocument();
  });

  it('T006: os links de página carregam o termo buscado', () => {
    renderWithIntl(<OwnersSearchView data={page()} />);
    expect(screen.getByRole('link', { name: 'Próxima' })).toHaveAttribute('href', pageHref('Lima', 2, 5));
    expect(pageHref('da Silva', 3, 10)).toBe('/owners?lastName=da+Silva&page=3&pageSize=10');
  });

  it('T009/T013: um resultado só leva à ficha; lista vazia ou sem termo não', () => {
    expect(singleResultTarget(page({ items: [owner(9)], total: 1 }))).toBe('/owners/9');
    expect(singleResultTarget(page({ items: [owner(9)], total: 1, lastName: '' }))).toBeNull();
    expect(singleResultTarget(page())).toBeNull();
  });

  it('mostra os donos e traduz para inglês pelo catálogo (P7)', () => {
    renderWithIntl(<OwnersSearchView data={page({ page: 2 })} />, 'en');
    expect(screen.getByText('Ana Lima1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Previous' })).toBeInTheDocument();
  });
});
