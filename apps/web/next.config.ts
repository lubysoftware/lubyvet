import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/** D31: o navegador fala só com o Next; /api/* é reescrito para o NestJS interno. */
const config: NextConfig = {
  // O AGENTS.md desta pasta é escrito pela equipe; o `next dev` não acrescenta bloco próprio.
  agentRules: false,
  // O E2E compila com a API dos containers embutida no rewrite; não sobrescreve o build normal.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${process.env.API_URL ?? 'http://localhost:3001'}/api/:path*` },
    ];
  },
};

export default createNextIntlPlugin('./src/i18n/request.ts')(config);
