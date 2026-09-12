#!/bin/sh
set -eu

ROOT="$PWD"

if [ -f ../../pnpm-lock.yaml ] && [ -d ../../packages/shared ]; then
  echo "hs-build: git monorepo"
  cd ../..
  pnpm --filter @hirestack/shared build
  pnpm exec prisma generate
  if [ -n "${DATABASE_URL:-}" ]; then
    echo "hs-build: prisma migrate deploy"
    pnpm exec prisma migrate deploy
  fi
  pnpm --filter @hirestack/api build
  exit 0
fi

echo "hs-build: bootstrap cwd=${ROOT}"
cd /tmp/hirestack
npx --yes pnpm@10.33.3 --filter @hirestack/shared build
npx --yes pnpm@10.33.3 exec prisma generate
if [ -n "${DATABASE_URL:-}" ]; then
  echo "hs-build: prisma migrate deploy"
  npx --yes pnpm@10.33.3 exec prisma migrate deploy
fi
npx --yes pnpm@10.33.3 --filter @hirestack/api build

cd "$ROOT"
rm -rf src dist node_modules
cp -a /tmp/hirestack/apps/api/src src
cp -a /tmp/hirestack/apps/api/dist dist
cp /tmp/hirestack/apps/api/package.json ./package.json
cp /tmp/hirestack/apps/api/nest-cli.json ./nest-cli.json
cp /tmp/hirestack/apps/api/tsconfig.app.json ./tsconfig.app.json
cp /tmp/hirestack/tsconfig.base.json ./tsconfig.base.json
cp /tmp/hirestack/tsconfig.base.json /tsconfig.base.json || true
cat > ./tsconfig.json <<'EOF'
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "declaration": false,
    "declarationMap": false,
    "noEmit": false,
    "strictPropertyInitialization": false
  },
  "include": ["src/**/*.ts"]
}
EOF
ln -sfn /tmp/hirestack/apps/api/node_modules "$ROOT/node_modules"
ln -sfn /tmp/hirestack/packages /packages || true
ln -sfn /tmp/hirestack/node_modules /node_modules || true
ln -sfn /tmp/hirestack/prisma /prisma || true
test -f src/main.ts
test -f dist/main.js
echo "hs-build: nest inputs ready"
