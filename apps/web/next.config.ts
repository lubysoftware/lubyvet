import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/** D31: o navegador fala só com o Next; /api/* é reescrito para o NestJS interno. */
const config: NextConfig = {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${process.env.API_URL ?? 'http://localhost:3001'}/api/:path*` },
    ];
  },
};

export default createNextIntlPlugin('./src/i18n/request.ts')(config);
