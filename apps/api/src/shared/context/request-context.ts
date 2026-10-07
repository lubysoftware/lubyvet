import { AsyncLocalStorage } from 'node:async_hooks';

/** D02: identidade da requisição em curso, lida pelos repositórios para gravar a autoria. */
const storage = new AsyncLocalStorage<{ userId: number | null }>();

export const requestContext = {
  /** Middleware: abre um contexto vazio para a requisição inteira. */
  middleware(_req: unknown, _res: unknown, next: () => void): void {
    storage.run({ userId: null }, next);
  },
  /** O guard identifica o usuário dentro do contexto aberto pelo middleware. */
  set(userId: number): void {
    const store = storage.getStore();
    if (store) store.userId = userId;
  },
  run<T>(userId: number, fn: () => T): T {
    return storage.run({ userId }, fn);
  },
  /** Usuário da requisição; null fora de uma requisição identificada. */
  actorId(): number | null {
    return storage.getStore()?.userId ?? null;
  },
};
