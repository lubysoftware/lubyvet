export default async function globalTeardown(): Promise<void> {
  await (globalThis as { __pg?: { stop(): Promise<unknown> } }).__pg?.stop();
}
