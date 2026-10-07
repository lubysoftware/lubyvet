import { FixedClock } from '../../../shared/domain/clock';
import { NotFound } from '../../../shared/domain/errors';
import type { OwnerRepository } from '../../owners/application/ports/owner-repository.port';
import { GetOwnerRecord, type OwnerRecordReader } from './owner-record.use-case';

describe('GetOwnerRecord', () => {
  const clock = FixedClock.at('2026-10-07T12:00:00-03:00');
  const owners = (exists: boolean) =>
    ({ findById: async () => (exists ? ({} as never) : null) }) as unknown as OwnerRepository;
  const calls: number[][] = [];
  const reader: OwnerRecordReader = {
    petsWithVisits: async (o, off, lim) => (calls.push([o, off, lim]), []),
  };

  it('lê a página pedida de visitas e responde "não encontrado" para dono inexistente', async () => {
    await new GetOwnerRecord(owners(true), reader, clock).execute(7, 3, 10);
    expect(calls).toEqual([[7, 20, 10]]);
    await expect(new GetOwnerRecord(owners(false), reader, clock).execute(7, 1, 10)).rejects.toBeInstanceOf(
      NotFound,
    );
  });
});
