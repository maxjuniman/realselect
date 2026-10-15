#!/usr/bin/env bash
set -euo pipefail

if [ -z "${APP_DIR:-}" ]; then
  APP_DIR="/opt/realselect/app/docker"
fi

BRANCH="${DEPLOY_BRANCH:-master}"
REPO_SSH="git@github.com:maxjuniman/realselect.git"
REPO_HTTPS="https://github.com/maxjuniman/realselect.git"

if [ -n "${GITHUB_DEPLOY_KEY:-}" ]; then
  mkdir -p "${HOME}/.ssh"
  chmod 700 "${HOME}/.ssh"
  printf '%s\n' "${GITHUB_DEPLOY_KEY}" > "${HOME}/.ssh/realselect_deploy"
  chmod 600 "${HOME}/.ssh/realselect_deploy"
  ssh-keyscan -t ed25519,rsa github.com >> "${HOME}/.ssh/known_hosts" 2>/dev/null
  export GIT_SSH_COMMAND="ssh -i ${HOME}/.ssh/realselect_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes"
  REPO_URL="${REPO_SSH}"
elif [ -n "${GITHUB_PAT:-}" ]; then
  REPO_URL="https://x-access-token:${GITHUB_PAT}@github.com/maxjuniman/realselect.git"
else
  REPO_URL="${REPO_HTTPS}"
fi

mkdir -p "${APP_DIR}"
cd "${APP_DIR}"

if [ ! -d .git ]; then
  echo "Iniciando o repositório em ${APP_DIR}."
  git init
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "${REPO_URL}"
else
  git remote add origin "${REPO_URL}"
fi

echo "Baixando a branch ${BRANCH}."
git fetch origin "${BRANCH}"
git checkout -B "${BRANCH}" "origin/${BRANCH}"
git reset --hard "origin/${BRANCH}"
git remote set-url origin "${REPO_HTTPS}"

if [ ! -f .env ]; then
  echo "Crie ${APP_DIR}/.env com DATABASE_URL, POSTGRES_NETWORK e JWT_SECRET antes do deploy."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  docker compose up -d --build
  docker compose ps
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose up -d --build
  docker-compose ps
else
  echo "Docker Compose não está instalado na VPS."
  exit 1
fi
