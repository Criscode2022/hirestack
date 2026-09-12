#!/bin/sh
set -eu

ROOT="$PWD"

if [ -f ../../pnpm-lock.yaml ] && [ -d ../../packages/shared ]; then
  echo "hs-build: git monorepo"
  cd ../..
  pnpm --filter @hirestack/shared build
  pnpm --filter @hirestack/web build
  exit 0
fi

echo "hs-build: bootstrap cwd=${ROOT}"
cd /tmp/hirestack
npx --yes pnpm@10.33.3 --filter @hirestack/shared build
npx --yes pnpm@10.33.3 --filter @hirestack/web build

cd "$ROOT"
rm -rf dist
mkdir -p dist/hirestack-web
cp -a /tmp/hirestack/apps/web/dist/hirestack-web/browser dist/hirestack-web/browser
test -f dist/hirestack-web/browser/index.html
echo "hs-build: static browser output ready"
