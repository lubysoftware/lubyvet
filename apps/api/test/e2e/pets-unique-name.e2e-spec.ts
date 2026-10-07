import { bootApp, type TestApp } from '../support/app';
import { anOwner, aPetInput, patchPet, postPet } from '../support/pets';
import { testDb } from '../support/test-db';

// 003/T018: nome de animal único por dono, sem diferenciar maiúsculas (REQ-014).
describe('unicidade de nome de animal por dono', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootApp();
  });
  beforeEach(() => testDb.truncate());
  afterAll(async () => {
    await t.close();
    await testDb.close();
  });
  const taken = { path: 'name', code: 'pet_name_taken' };

  it('UT-014-1: o segundo Rex do mesmo dono é recusado no campo nome', async () => {
    const o = await anOwner(t);
    await postPet(t, o.id, aPetInput({ name: 'Rex' })).expect(201);
    expect((await postPet(t, o.id, aPetInput({ name: 'Rex' })).expect(422)).body.error.fields).toEqual([
      taken,
    ]);
  });

  it('UT-014-2: donos diferentes podem ter um Rex cada', async () => {
    await postPet(t, (await anOwner(t)).id, aPetInput({ name: 'Rex' })).expect(201);
    await postPet(t, (await anOwner(t)).id, aPetInput({ name: 'Rex' })).expect(201);
  });

  it('UT-014-3: "rex" e "Rex" são o mesmo nome', async () => {
    const o = await anOwner(t);
    await postPet(t, o.id, aPetInput({ name: 'Rex' })).expect(201);
    expect((await postPet(t, o.id, aPetInput({ name: 'rex' })).expect(422)).body.error.fields).toEqual([
      taken,
    ]);
  });

  it('UT-014-4: editar o próprio animal mantendo o nome é aceito', async () => {
    const o = await anOwner(t);
    const p = (await postPet(t, o.id, aPetInput({ name: 'Rex' })).expect(201)).body;
    await patchPet(t, o.id, p.id, { version: p.version, name: 'REX' }).expect(200);
  });

  it('UT-014-5: renomear para o nome de outro animal do mesmo dono é recusado', async () => {
    const o = await anOwner(t);
    await postPet(t, o.id, aPetInput({ name: 'Rex' })).expect(201);
    const mel = (await postPet(t, o.id, aPetInput({ name: 'Mel' })).expect(201)).body;
    expect(
      (await patchPet(t, o.id, mel.id, { version: mel.version, name: 'rex' }).expect(422)).body.error.fields,
    ).toEqual([taken]);
  });

  it('UT-014-6: a restrição do banco tem nome próprio e ignora a caixa', async () => {
    const o = await anOwner(t);
    await testDb.sql.query(
      "insert into pets (owner_id, name, birth_date, species_id, updated_at) values ($1, 'Rex', '2020-01-01', 1, now())",
      [o.id],
    );
    await expect(
      testDb.sql.query(
        "insert into pets (owner_id, name, birth_date, species_id, updated_at) values ($1, 'REX', '2020-01-01', 1, now())",
        [o.id],
      ),
    ).rejects.toMatchObject({ constraint: 'pets_owner_id_lower_name_key' });
  });

  it('UT-014-7: a recusa nunca vira erro 500', async () => {
    const o = await anOwner(t);
    await postPet(t, o.id, aPetInput({ name: 'Rex' })).expect(201);
    const res = await postPet(t, o.id, aPetInput({ name: 'rEx' }));
    expect(res.status).toBe(422);
  });
});
