import { countersFor } from './metrics-subscriber';

describe('MetricsSubscriber (011/T012)', () => {
  it('traduz cada evento no contador de D27, com os mesmos rótulos', () => {
    expect(countersFor({ type: 'owner_registered', ownerId: 1 })).toEqual([['owners_created']]);
    expect(countersFor({ type: 'similar_owner_warned' })).toEqual([['similar_owner_shown']]);
    expect(
      countersFor({ type: 'encounter_recorded', encounterId: 1, vetId: 7, returnSuggested: true }),
    ).toEqual([['encounters_recorded', { vet_id: '7' }], ['returns_suggested']]);
    expect(
      countersFor({ type: 'encounter_recorded', encounterId: 1, vetId: null, returnSuggested: false }),
    ).toEqual([['encounters_recorded', {}]]);
    expect(countersFor({ type: 'whatsapp_sent', outboxId: 1, kind: 'reminder' })).toEqual([
      ['whatsapp_sent', { type: 'reminder' }],
    ]);
  });
});
