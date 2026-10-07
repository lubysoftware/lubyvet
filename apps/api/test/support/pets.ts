import { anOwnerInput } from '../builders/owner.builder';
import { idem, type TestApp } from './app';
import { SPECIES } from './test-db';

export const aPetInput = (over: Record<string, unknown> = {}) => ({
  name: 'Thor',
  birthDate: '2020-05-01',
  speciesId: SPECIES.dog,
  ...over,
});

export async function anOwner(t: TestApp): Promise<{ id: number }> {
  return (await t.api.post('/api/owners').set(idem()).send(anOwnerInput()).expect(201)).body;
}

export function postPet(t: TestApp, ownerId: number, body: object) {
  return t.api.post(`/api/owners/${ownerId}/pets`).set(idem()).send(body);
}

export function patchPet(t: TestApp, ownerId: number, petId: number, body: object) {
  return t.api.patch(`/api/owners/${ownerId}/pets/${petId}`).set(idem()).send(body);
}
