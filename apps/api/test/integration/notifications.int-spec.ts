import { Notifications } from '../../src/modules/notifications/application/notifications.use-cases';
import { PrismaOutbox } from '../../src/modules/notifications/infra/prisma-outbox';
import { RabbitQueue } from '../../src/modules/notifications/infra/rabbit-queue';
import { FakeOwnerNotifier } from '../../src/modules/notifications/infra/senders';
import { Appointment } from '../../src/modules/visits/domain/appointment';
import { PrismaVisitRepository } from '../../src/modules/visits/infra/prisma-visit.repository';
import { FixedClock } from '../../src/shared/domain/clock';
import { PrismaService } from '../../src/shared/infra/prisma.service';
import { testDb } from '../support/test-db';

const waitFor = async (fn: () => Promise<boolean>): Promise<void> => {
  for (let i = 0; i < 100; i++)
    if (await fn()) return;
    else await new Promise((r) => setTimeout(r, 100));
  throw new Error('tempo esgotado');
};

// 004/T023, T024 contra Postgres e RabbitMQ reais (D12).
describe('notificação ao dono pelo RabbitMQ', () => {
  const db = new PrismaService();
  const queue = new RabbitQueue();
  const clock = FixedClock.at('2026-10-07T12:00:00-03:00');
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await queue.onModuleDestroy();
    await db.$disconnect();
    await testDb.close();
  });

  const seed = async (consent: boolean) => {
    const { rows } = await testDb.sql.query<{ id: number }>(
      "insert into owners (first_name, last_name, address, city, telephone, cpf, messaging_consent_at, updated_at) values ('Mariana', 'T', 'R', 'C', '+5511987654321', '52998224725', $1, now()) returning id",
      [consent ? new Date() : null],
    );
    const pet = await testDb.sql.query<{ id: number }>(
      "insert into pets (owner_id, name, birth_date, species_id, updated_at) values ($1, 'Thor', '2020-01-01', 2, now()) returning id",
      [rows[0]?.id],
    );
    return new PrismaVisitRepository(db).insertAppointment(
      Appointment.schedule(
        pet.rows[0]?.id ?? 0,
        { scheduledAt: new Date('2026-10-08T10:00:00-03:00'), description: 'Vacina' },
        clock.now(),
      ),
    );
  };

  it('a confirmação entra na caixa de saída com o agendamento, vai à fila e é entregue', async () => {
    await seed(true);
    expect(await testDb.count('notification_outbox', { kind: 'confirmation', status: 'pending' })).toBe(1);
    const fake = new FakeOwnerNotifier();
    const n = new Notifications(new PrismaOutbox(db), queue, fake, clock);
    await queue.consume(
      async (id) => void (await n.deliver(id)),
      (id) => n.failed(id),
    );
    await n.publishPending();
    await waitFor(async () => (await testDb.count('notification_outbox', { status: 'sent' })) === 1);
    expect(fake.sent[0]).toMatchObject({ to: '+5511987654321', kind: 'confirmation' });
  });

  it('sem consentimento não envia e não falha; o lembrete do D-1 não duplica', async () => {
    await seed(false);
    const n = new Notifications(new PrismaOutbox(db), queue, new FakeOwnerNotifier(), clock);
    const outboxId =
      (await testDb.sql.query<{ id: number }>('select id from notification_outbox')).rows[0]?.id ?? 0;
    expect(await n.deliver(outboxId)).toBe('skipped');
    expect(await n.enqueueReminders()).toBe(1);
    expect(await n.enqueueReminders()).toBe(0);
    expect(await testDb.count('notification_outbox', { kind: 'reminder' })).toBe(1);
  });
});
