# syntax=docker/dockerfile:1
# Imagem do web (Next.js standalone). D31: só o web fica exposto; /api/* é reescrito para a API
# interna, e o rewrite é resolvido no build, por isso API_URL é argumento de build.
ARG NODE_IMAGE=node:24-bookworm-slim

FROM oven/bun:1.2.3-slim AS bun

FROM ${NODE_IMAGE} AS deps
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /repo
COPY package.json bun.lock ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN bun install --frozen-lockfile

FROM deps AS build
ARG API_URL=http://api:3001
ENV API_URL=${API_URL} NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/web apps/web
RUN bun run --cwd packages/contracts build && cd apps/web && ../../node_modules/.bin/next build

FROM ${NODE_IMAGE} AS runtime
ARG API_URL=http://api:3001
ENV NODE_ENV=production TZ=America/Sao_Paulo API_URL=${API_URL} HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static apps/web/.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=2s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
