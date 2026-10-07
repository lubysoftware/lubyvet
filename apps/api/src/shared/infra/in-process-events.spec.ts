import type { DomainEvent } from '../domain/events';
import { InProcessEvents } from './in-process-events';
import { logger } from './logger';

describe('InProcessEvents (011/T010)', () => {
  it('entrega cada evento a todos os assinantes, em ordem', () => {
    const bus = new InProcessEvents();
    const seen: string[] = [];
    bus.subscribe((e) => void seen.push(`a:${e.type}`));
    bus.subscribe((e) => void seen.push(`b:${e.type}`));
    bus.publish({ type: 'pet_registered', petId: 1 });
    expect(seen).toEqual(['a:pet_registered', 'b:pet_registered']);
  });

  it('a falha de um assinante vai para o log e não impede os outros', () => {
    const bus = new InProcessEvents();
    const log = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    const ok: DomainEvent[] = [];
    bus.subscribe(() => {
      throw new Error('boom');
    });
    bus.subscribe((e) => void ok.push(e));
    expect(() => bus.publish({ type: 'similar_owner_warned' })).not.toThrow();
    expect(ok).toHaveLength(1);
    expect(log).toHaveBeenCalledWith({ event: 'similar_owner_warned', err: 'Error' }, 'assinante de evento');
  });
});
