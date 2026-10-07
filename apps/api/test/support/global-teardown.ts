export default async function globalTeardown(): Promise<void> {
  await Promise.all(
    ((globalThis as { __containers?: { stop(): Promise<unknown> }[] }).__containers ?? []).map((c) =>
      c.stop(),
    ),
  );
}
