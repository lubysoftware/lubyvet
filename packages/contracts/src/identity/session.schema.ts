import { z } from 'zod';
import { ROLES } from '../errors';

export const LoginInput = z.object({
  login: z.string({ error: 'required' }).trim().min(1, { error: 'required' }),
  password: z.string({ error: 'required' }).min(1, { error: 'required' }),
});
export type LoginInput = z.infer<typeof LoginInput>;
export const SessionOutput = z.object({ userId: z.number().int(), name: z.string(), role: z.enum(ROLES) });
export type SessionOutput = z.infer<typeof SessionOutput>;
