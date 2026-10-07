import type { PetOutput } from '@lubyvet/contracts';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/render';
import { mockFetch, sentBody } from '@/test/fetch';
import { PetEditor, petInput } from './pet-editor';

const assign = vi.fn();
beforeEach(() => {
  assign.mockReset();
  Object.defineProperty(window, 'location', { value: { assign }, writable: true });
});
afterEach(() => vi.unstubAllGlobals());

const species = [
  { id: 1, name: 'Gato' },
  { id: 2, name: 'Cão' },
];
const pet: PetOutput = {
  id: 5,
  ownerId: 7,
  name: 'Bidu',
  birthDate: '2020-03-04',
  species: { id: 9, name: 'Furão' },
  status: 'active',
  version: 1,
  createdAt: '',
  updatedAt: '',
};

describe('cadastro e alteração do animal (003/US-1, US-3)', () => {
  it('P-10: a espécie vai como número; sem escolha, o contrato acusa species_required', async () => {
    expect(petInput({ name: 'Rex', birthDate: '2020-01-01', speciesId: '2' })).toEqual({
      name: 'Rex',
      birthDate: '2020-01-01',
      speciesId: 2,
    });
    const fetch = mockFetch();
    renderWithIntl(<PetEditor ownerId={7} species={species} />);
    await userEvent.type(screen.getByLabelText('Nome do animal'), 'Rex');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar animal' }));
    expect(screen.getByLabelText('Espécie')).toHaveAccessibleDescription('Escolha a espécie.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('cadastra pelo dono e volta à ficha com o animal escolhido', async () => {
    const fetch = mockFetch({ status: 201, body: { ...pet, id: 8 } });
    renderWithIntl(<PetEditor ownerId={7} species={species} />);
    await userEvent.type(screen.getByLabelText('Nome do animal'), 'Rex');
    await userEvent.type(screen.getByLabelText('Data de nascimento'), '2020-01-02');
    await userEvent.selectOptions(screen.getByLabelText('Espécie'), 'Cão');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar animal' }));
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/owners/7/pets');
    expect(sentBody(fetch)).toEqual({ name: 'Rex', birthDate: '2020-01-02', speciesId: 2 });
    expect(assign).toHaveBeenCalledWith('/owners/7?pet=8&saved=petSaved');
  });

  it('a alteração mantém a espécie atual inativa na lista e manda versão e situação', async () => {
    const fetch = mockFetch({
      status: 422,
      body: { error: { code: 'validation_failed', fields: [{ path: 'status', code: 'invalid_format' }] } },
    });
    renderWithIntl(<PetEditor ownerId={7} species={species} pet={pet} />);
    expect(screen.getByLabelText('Espécie')).toHaveDisplayValue('Furão');
    await userEvent.selectOptions(screen.getByLabelText('Situação'), 'Falecido');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar animal' }));
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/owners/7/pets/5');
    expect(sentBody(fetch)).toMatchObject({ version: 1, status: 'deceased', speciesId: 9 });
    expect(screen.getByLabelText('Situação')).toHaveAccessibleDescription('Formato inválido.');
  });
});
