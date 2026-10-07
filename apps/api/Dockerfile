# syntax=docker/dockerfile:1
# Imagem da API (D31). A mesma imagem roda a API, o worker do WhatsApp, as migrações e os
# comandos (lembretes D-1, criação de usuário). Contexto: a raiz do repositório.
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
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN bun run --cwd packages/contracts build && bun run --cwd apps/api build

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production TZ=America/Sao_Paulo
WORKDIR /repo
COPY --from=build /repo/package.json ./
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/packages/contracts/package.json packages/contracts/
COPY --from=build /repo/packages/contracts/dist packages/contracts/dist
COPY --from=build /repo/apps/api/package.json /repo/apps/api/prisma.config.ts apps/api/
COPY --from=build /repo/apps/api/prisma apps/api/prisma
COPY --from=build /repo/apps/api/dist apps/api/dist
WORKDIR /repo/apps/api
USER node
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=2s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
