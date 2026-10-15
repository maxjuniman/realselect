#!/usr/bin/env bash
set -eu

say() { echo "$@" >&2; }

if [ -z "${APP_DIR:-}" ]; then
  APP_DIR="/opt/realselect/app/docker"
fi
APP_DIR=$(printf '%s' "${APP_DIR}" | tr -d '\r')

BRANCH="${DEPLOY_BRANCH:-master}"
BRANCH=$(printf '%s' "${BRANCH}" | tr -d '\r')
REPO_HTTPS="https://github.com/maxjuniman/realselect.git"

say "Pasta do deploy: ${APP_DIR}"
mkdir -p "${APP_DIR}"
cd "${APP_DIR}"
git config --global --add safe.directory "${APP_DIR}" || true

if [ ! -d .git ]; then
  say "Iniciando o repositório."
  git init
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "${REPO_HTTPS}"
else
  git remote add origin "${REPO_HTTPS}"
fi

say "Baixando a branch ${BRANCH}."
git fetch origin "${BRANCH}"
git checkout -B "${BRANCH}" "origin/${BRANCH}"
git reset --hard "origin/${BRANCH}"

if [ ! -f .env ]; then
  say "Não achei ${APP_DIR}/.env. O deploy precisa desse arquivo com DATABASE_URL, POSTGRES_NETWORK e JWT_SECRET."
  ls -la >&2 || true
  exit 1
fi

say "Subindo os containers."
if docker compose version >/dev/null 2>&1; then
  docker compose up -d --build
  docker compose ps
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose up -d --build
  docker-compose ps
else
  say "Docker Compose não está instalado na VPS."
  exit 1
fi
