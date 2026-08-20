# HireStack agent guide

This monorepo is a two-sided hiring marketplace. Prefer small, compiling changes over speculative refactors.

## Layout

- `apps/web` — Angular 22, standalone, zoneless, OnPush default, Signal Forms, `httpResource`, `@Service()`.
- `apps/api` — NestJS Fluid Function. Entrypoint is `apps/api/src/main.ts` and it listens on `process.env.PORT ?? 3000`.
- `packages/shared` — enums, API contracts, application state machine. UI and API must import from here.
- `prisma/` — schema, migrations, seed.

## Rules

- Do not introduce NgModules, Zone.js, or template-driven forms.
- Use `inject()` only. Root singletons use `@Service()`.
- Mutations go through `HttpClient`; reads use `httpResource` / `resource`. Reload the resource after writes.
- Application status changes must go through `assertLegalTransition`. Illegal moves are HTTP 409 + `ILLEGAL_TRANSITION`.
- Never store uploaded files on the Nest filesystem. Use Vercel Blob.
- Never commit `.env` files or secrets.

## Commands

```bash
pnpm install
pnpm prisma:migrate:dev
pnpm prisma:seed
pnpm dev:all    # api :3000 + web :4200
pnpm dev:api    # :3000
pnpm dev:web    # :4200
pnpm test
```

## Auth

Access JWTs live in memory. Refresh tokens are httpOnly cookies (`hs_refresh`) scoped to `/api/auth`. After a reload, bootstrap calls `POST /api/auth/refresh`.

## Deploy

Two Vercel projects from this repo:

- `hirestack-api` (`prj_xDMCF55ThMXgZyVqeKVmuht4br7n`) root directory `apps/api`
- `hirestack-web` (`prj_vg09GADHx67h4aBvEsAgc5FpoUlZ`) root directory `apps/web`

Angular 22 needs Node `>=22.22.3`. Set `WEB_ORIGIN` to the Angular URL before shipping CORS. `scripts/deploy-vercel.sh` needs `VERCEL_TOKEN` and does not print secrets.
