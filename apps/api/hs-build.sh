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
rm -rf /tmp/api-pack
npx --yes pnpm@10.33.3 --filter @hirestack/api deploy --legacy /tmp/api-pack

cd "$ROOT"
rm -rf src dist node_modules
cp -a /tmp/api-pack/src src
cp -a /tmp/api-pack/dist dist
cp -a /tmp/api-pack/node_modules node_modules
cp /tmp/api-pack/package.json ./package.json
cp /tmp/api-pack/nest-cli.json ./nest-cli.json
cp /tmp/api-pack/tsconfig.app.json ./tsconfig.app.json
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
test -f src/main.ts
test -f dist/main.js
test -f node_modules/@nestjs/core/package.json
echo "hs-build: nest inputs ready"
