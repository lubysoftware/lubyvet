import { PetNameTaken } from '../../src/modules/pets/domain/pet.errors';
import { Pet } from '../../src/modules/pets/domain/pet';
import { PrismaPetRepository } from '../../src/modules/pets/infra/prisma-pet.repository';
import { PrismaService } from '../../src/shared/infra/prisma.service';
import { SPECIES, testDb } from '../support/test-db';

// 003/T019: duas conexões gravam o mesmo nome para o mesmo dono ao mesmo tempo (CA-2.4).
describe('cadastro concorrente do mesmo nome de animal', () => {
  const a = new PrismaService();
  const b = new PrismaService();
  const now = new Date('2026-10-07T12:00:00-03:00');
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await Promise.all([a.$disconnect(), b.$disconnect()]);
    await testDb.close();
  });

  it('a verificação preventiva não pega a corrida; o banco pega, e a recusa vira PetNameTaken', async () => {
    const { rows } = await testDb.sql.query<{ id: number }>(
      "insert into owners (first_name, last_name, address, city, telephone, cpf, updated_at) values ('A', 'B', 'C', 'D', '+5511987654321', '52998224725', now()) returning id",
    );
    const ownerId = rows[0]?.id ?? 0;
    const pet = () =>
      Pet.register(ownerId, { name: 'Mel', birthDate: '2020-01-01', speciesId: SPECIES.cat }, now);
    const [ra, rb] = [new PrismaPetRepository(a), new PrismaPetRepository(b)];
    expect(await Promise.all([ra.nameTaken(ownerId, 'Mel'), rb.nameTaken(ownerId, 'mel')])).toEqual([
      false,
      false,
    ]);

    const results = await Promise.allSettled([ra.insert(pet()), rb.insert(pet())]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(PetNameTaken);
    expect(await testDb.count('pets', { owner_id: ownerId })).toBe(1);
  });
});
