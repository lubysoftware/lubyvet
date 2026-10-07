import { Operations } from './operations.use-cases';

describe('Operations (011/T006)', () => {
  it('prontidão e indicadores vêm do leitor de operação', async () => {
    const ops = new Operations({ databaseUp: async () => false, metrics: async () => ({ owners: 3 }) });
    await expect(ops.ready()).resolves.toBe(false);
    await expect(ops.indicators()).resolves.toEqual({ owners: 3 });
  });
});
