#!/bin/sh
set -eu

if [ -f ../../pnpm-lock.yaml ] && [ -d ../../packages/shared ]; then
  echo "hs-install: git monorepo"
  cd ../..
  pnpm install --frozen-lockfile
  exit 0
fi

REPO="https://codeload.github.com/Criscode2022/hirestack/tar.gz"
REF="${HIRESTACK_SHA:-refs/heads/cursor/saas-ready-hirestack-c232}"
echo "hs-install: fetching ${REF}"
rm -rf /tmp/hirestack
mkdir -p /tmp/hirestack
curl -fsSL "${REPO}/${REF}" | tar xz -C /tmp/hirestack --strip-components=1
cd /tmp/hirestack
npx --yes pnpm@10.33.3 install --frozen-lockfile
ln -sfn /tmp/hirestack/packages /packages || true
ln -sfn /tmp/hirestack/node_modules /node_modules || true
ln -sfn /tmp/hirestack/prisma /prisma || true
cp /tmp/hirestack/tsconfig.base.json /tsconfig.base.json || true
echo "hs-install: ready"
