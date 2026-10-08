import { CONSISTENCY } from '../support/consistency';
import { testDb } from '../support/test-db';

/**
 * Integridade de dados (análise de normalização de 08/10/2026): o banco recusa sozinho o que antes
 * só a aplicação impedia. Cada caso grava direto por SQL, sem passar pela API.
 */
const sql = (text: string, params: unknown[] = []) => testDb.sql.query(text, params);

async function fixture() {
  const owner = (
    await sql(
      `insert into owners (first_name, last_name, address, city, telephone, created_by, updated_by, updated_at)
       values ('A', 'B', 'C', 'D', '+5511987654321', 1, 1, now()) returning id`,
    )
  ).rows[0].id as number;
  const pet = async (name: string) =>
    (
      await sql(
        `insert into pets (owner_id, name, birth_date, species_id, updated_at) values ($1, $2, '2020-01-01', 1, now()) returning id`,
        [owner, name],
      )
    ).rows[0].id as number;
  const [rex, mel] = [await pet('Rex'), await pet('Mel')];
  const appt = (
    await sql(
      `insert into appointments (pet_id, scheduled_at, description, updated_at) values ($1, now(), 'x', now()) returning id`,
      [rex],
    )
  ).rows[0].id as number;
  return { owner, rex, mel, appt };
}

const rejects = async (text: string, params: unknown[], constraint: string) => {
  await expect(sql(text, params)).rejects.toMatchObject({ constraint });
};

describe('integridade de dados no banco', () => {
  beforeEach(() => testDb.truncate());
  afterAll(() => testDb.close());

  it('autoria aponta para usuário que existe', async () => {
    const { owner } = await fixture();
    await rejects('update owners set updated_by = 999 where id = $1', [owner], 'owners_updated_by_fkey');
  });

  it('atendimento só se liga a agendamento do mesmo animal (P1)', async () => {
    const { mel, appt } = await fixture();
    await rejects(
      `insert into encounters (pet_id, appointment_id, date, chief_complaint, updated_at) values ($1, $2, '2026-10-01', 'x', now())`,
      [mel, appt],
      'encounters_appointment_id_fkey',
    );
  });

  it('caixa de saída e anonimização apontam para o que existe', async () => {
    await rejects(
      `insert into notification_outbox (kind, appointment_id) values ('confirmation', 999)`,
      [],
      'notification_outbox_appointment_id_fkey',
    );
    await rejects(
      `insert into owner_anonymizations (owner_id, anonymized_at, anonymized_by, pending_spans) values (999, now(), 1, '[]')`,
      [],
      'owner_anonymizations_owner_id_fkey',
    );
  });

  it('situações, papéis e limites só aceitam os valores do domínio', async () => {
    const { rex, appt } = await fixture();
    await rejects('update pets set status = $1 where id = $2', ['morto', rex], 'pets_status_check');
    await rejects(
      'update appointments set status = $1 where id = $2',
      ['concluido', appt],
      'appointments_status_check',
    );
    await rejects(`update users set role = 'root' where id = 1`, [], 'users_role_check');
    await rejects(`update users set login = 'Ana@X' where id = 1`, [], 'users_login_lower_check');
    await rejects(
      `insert into encounters (pet_id, date, chief_complaint, weight_kg, updated_at) values ($1, '2026-10-01', 'x', 0, now())`,
      [rex],
      'encounters_weight_kg_check',
    );
    await rejects(
      `insert into notification_outbox (kind, appointment_id) values ('sms', $1)`,
      [appt],
      'notification_outbox_kind_check',
    );
  });

  it('as redundâncias de propósito ficam coerentes: situação = último histórico; Realizada só com atendimento', async () => {
    const { rex, appt } = await fixture();
    await sql(
      `insert into appointment_status_changes (appointment_id, from_status, to_status, changed_at) values ($1, null, 'scheduled', now())`,
      [appt],
    );
    await sql(
      `insert into encounters (pet_id, appointment_id, date, chief_complaint, updated_at) values ($1, $2, '2026-10-01', 'x', now())`,
      [rex, appt],
    );
    // O teste de consistência é a consulta que a operação roda; aqui ela acusa o caso fabricado.
    const { rows } = await sql(CONSISTENCY);
    expect(rows).toEqual([{ appointment_id: appt, problem: 'atendido sem Realizada' }]);
  });
});
