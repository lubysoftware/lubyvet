import { defineConfig } from 'prisma/config';

// P5: um dialeto, um diretório de migrações. A URL de verdade vem do ambiente (P-13).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? 'postgresql://lubyvet:lubyvet_dev@localhost:5433/lubyvet' },
});
