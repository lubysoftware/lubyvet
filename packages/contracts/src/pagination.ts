import { z } from 'zod';

/** P-06: 10 por página por padrão, de 5 a 50. */
export const PAGE_SIZE = { default: 10, min: 5, max: 50 } as const;

export const PageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(PAGE_SIZE.min).max(PAGE_SIZE.max).default(PAGE_SIZE.default),
});
export type PageQuery = z.infer<typeof PageQuery>;

export const pageOf = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
  });
