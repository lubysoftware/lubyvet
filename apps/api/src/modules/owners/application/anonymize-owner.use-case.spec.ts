import { FixedClock } from '../../../shared/domain/clock';
import { OwnerNotFound } from '../domain/owner.errors';
import {
  type AnonymizationPort,
  AnonymizeOwner,
  type FreeTextSpan,
  findSpans,
} from './anonymize-owner.use-case';

const clock = FixedClock.at('2026-10-07T12:00:00-03:00');
const port = (exists: boolean, pending: FreeTextSpan[] | null = []) => {
  const calls: unknown[] = [];
  const p: AnonymizationPort = {
    identityOf: async () => (exists ? { terms: ['Mariana', '11987654321'] } : null),
    freeTexts: async () => [
      { entity: 'appointment', id: 1, field: 'description', text: 'Ligar para MARIANA' },
    ],
    anonymize: async (...a) => void calls.push(['anon', ...a]),
    pending: async () => pending,
    redact: async (...a) => void calls.push(['redact', ...a]),
  };
  return { p, calls };
};

describe('AnonymizeOwner (D24, D25)', () => {
  it('acha o dado do dono sem caixa nem acento e registra só as posições', async () => {
    expect(findSpans('Mariána ligou de (11) 98765-4321', ['mariana', '11987654321'])).toEqual([
      { start: 0, end: 7 },
      { start: 17, end: 32 },
    ]);
    const { p, calls } = port(true);
    expect(await new AnonymizeOwner(p, clock).execute(7, 1)).toEqual({ pendingReview: 1 });
    expect(calls[0]).toEqual([
      'anon',
      7,
      clock.now(),
      1,
      [{ entity: 'appointment', id: 1, field: 'description', start: 11, end: 18 }],
    ]);
  });

  it('dono inexistente é "não encontrado"; a revisão aceita só trechos pendentes', async () => {
    await expect(new AnonymizeOwner(port(false).p, clock).execute(7, 1)).rejects.toBeInstanceOf(
      OwnerNotFound,
    );
    await expect(new AnonymizeOwner(port(true, null).p, clock).review(7)).rejects.toBeInstanceOf(
      OwnerNotFound,
    );
    await expect(new AnonymizeOwner(port(true, null).p, clock).redact(7, [], 1)).rejects.toBeInstanceOf(
      OwnerNotFound,
    );
    const span: FreeTextSpan = { entity: 'appointment', id: 1, field: 'description', start: 11, end: 18 };
    const { p, calls } = port(true, [span]);
    expect((await new AnonymizeOwner(p, clock).review(7))[0]?.text).toBe('Ligar para MARIANA');
    await new AnonymizeOwner(p, clock).redact(7, [span, { ...span, start: 0 }], 1);
    expect(calls).toEqual([['redact', 7, [span], clock.now(), 1]]);
  });
});
