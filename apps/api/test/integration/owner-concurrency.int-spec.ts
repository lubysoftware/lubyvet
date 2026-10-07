import { StaleVersion } from '../../src/shared/domain/errors';
import { PrismaService } from '../../src/shared/infra/prisma.service';
import { PrismaOwnerRepository } from '../../src/modules/owners/infra/prisma-owner.repository';
import { Owner } from '../../src/modules/owners/domain/owner';
import { validCpf } from '../builders/owner.builder';
import { testDb } from '../support/test-db';

// 001/T016: a corrida real precisa de duas conexões e de um banco (CA-5.1).
describe('edição concorrente do dono, com duas conexões', () => {
  const a = new PrismaService();
  const b = new PrismaService();
  const now = new Date('2026-10-07T12:00:00-03:00');
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await Promise.all([a.$disconnect(), b.$disconnect()]);
    await testDb.close();
  });

  it('duas sessões leem a mesma versão e gravam juntas: exatamente uma é aceita', async () => {
    const created = await new PrismaOwnerRepository(a).insert(
      Owner.register(
        {
          firstName: 'Mariana',
          lastName: 'Teixeira',
          address: 'Rua A, 1',
          city: 'São Paulo',
          telephone: '(11) 98765-4321',
          cpf: validCpf(9),
          messagingConsent: false,
        },
        now,
      ),
    );
    const id = created.id ?? 0;
    const [repoA, repoB] = [new PrismaOwnerRepository(a), new PrismaOwnerRepository(b)];
    const [ownerA, ownerB] = await Promise.all([repoA.findById(id), repoB.findById(id)]);
    ownerA?.changeContact({ city: 'Campinas' }, 0, now);
    ownerB?.changeContact({ city: 'Santos' }, 0, now);

    const results = await Promise.allSettled([
      repoA.update(ownerA as Owner, 0),
      repoB.update(ownerB as Owner, 0),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(StaleVersion);
    const { rows } = await testDb.sql.query<{ version: number }>('select version from owners where id = $1', [
      id,
    ]);
    expect(rows[0]?.version).toBe(1);
  });
});
