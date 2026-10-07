#!/usr/bin/env bash
# Clonou, roda. ./run.sh [dev|verify|infra|stop|user]
set -euo pipefail
cd "$(dirname "$0")"

if [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh" >/dev/null; nvm use >/dev/null 2>&1 || nvm install >/dev/null; fi

install() {
  # O npm encerra sem erro durante a resolução nesta máquina; o bun instala o mesmo package.json.
  if [ ! -d node_modules ]; then
    if command -v bun >/dev/null; then bun install; else npm install; fi
  fi
}

infra() { docker compose up -d --wait postgres redis rabbitmq; }

case "${1:-dev}" in
  infra) infra ;;
  stop) docker compose down ;;
  verify) install; bun run verify ;;
  dev)
    install
    infra
    [ -f apps/api/.env ] || cp .env.example apps/api/.env
    set -a; . apps/api/.env; set +a
    bun run --cwd packages/contracts build
    (cd apps/api && npx prisma migrate deploy)
    # API em segundo plano, web na frente (http://localhost:3000); Ctrl+C derruba os dois.
    bun run --cwd apps/api dev &
    api=$!
    trap 'kill $api 2>/dev/null' EXIT
    bun run --cwd apps/web dev
    ;;
  user)
    # D18: cria ou atualiza um usuário. A senha vem do ambiente, nunca de arquivo:
    #   LV_LOGIN=ana@clinica LV_NAME="Ana" LV_ROLE=admin LV_PASSWORD=... ./run.sh user
    install
    [ -f apps/api/.env ] || cp .env.example apps/api/.env
    set -a; . apps/api/.env; set +a
    bun run --cwd packages/contracts build
    bun run --cwd apps/api build >/dev/null
    node apps/api/dist/commands/create-user.js
    ;;
  *) echo "uso: ./run.sh [dev|verify|infra|stop|user]"; exit 1 ;;
esac
