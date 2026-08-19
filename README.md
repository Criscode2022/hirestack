# HireStack

A two-sided job and freelance marketplace for people who want hiring software that behaves like a product, not a CRUD demo.

**Candidates** search crawlable listings, keep a resume history, apply once per job, and watch a real pipeline. **Employers** claim one company, post roles, and move applicants only along legal transitions. **Admins** suspend users, unpublish jobs, and clear the report queue.

## Who it is for

Independent recruiters, early-stage operators, and portfolio reviewers who need evidence of RBAC, SSR search, file uploads, and a live deploy — not another todo app with a login screen.

## Architecture

```mermaid
flowchart LR
  Browser["Angular 22 SSR<br/>hirestack-web"] -->|JSON + refresh cookie| API["NestJS Fluid Function<br/>hirestack-api"]
  API --> Neon["Neon Postgres<br/>Prisma + pg_trgm"]
  API --> Blob["Vercel Blob<br/>resumes + logos"]
  API --> Mail["Resend<br/>or structured logs"]
```

One pnpm monorepo. Two Vercel projects. Shared enums live in `packages/shared` so the UI cannot invent a status the API does not understand.

## Domain

Jobs are `DRAFT | PUBLISHED | CLOSED`. Applications are a state machine, not a free-text dropdown:

```
SUBMITTED → REVIEWING → INTERVIEW → OFFER → HIRED
SUBMITTED / REVIEWING / INTERVIEW → REJECTED
Candidate may WITHDRAWN from SUBMITTED or REVIEWING only
```

Illegal transitions return **409** with `error: ILLEGAL_TRANSITION`. Apply + first `ApplicationEvent` run in a Prisma transaction. Duplicate `(jobId, candidateId)` is rejected.

Search uses `ILIKE` plus `pg_trgm` GIN indexes on `Job.title` and `Job.location`. Relevance sort ranks trigram similarity when `q` is present.

## Stack and why

| Choice | Why |
| --- | --- |
| Angular 22 | Signal Forms, `httpResource`, `@Service()`, zoneless + OnPush default, Angular Aria |
| NestJS on Vercel Fluid | One function, zero-config `src/main.ts` + `PORT` detection |
| Neon + Prisma adapter | Serverless pooling without a standing Node process |
| Vercel Blob | Serverless uploads; no local disk |
| Postgres search | Honest v1. Dedicated search is the upgrade, not the starting point |

## Local setup

```bash
corepack enable
pnpm install
cp .env.example apps/api/.env
# fill DATABASE_URL, DATABASE_URL_UNPOOLED, JWT secrets
pnpm prisma:migrate:dev
pnpm prisma:seed
pnpm dev
```

- API: http://localhost:3000/api/health and http://localhost:3000/api/docs
- Web: http://localhost:4200 (`environment.development.ts` points at the local API)

## Seed accounts

Password for every seed user: `HireStack!2026`

| Role | Email |
| --- | --- |
| Admin | `admin@hirestack.dev` |
| Employer (Northwind Labs) | `employer.northwind@hirestack.dev` |
| Employer (Atlas Freight) | `employer.atlas@hirestack.dev` |
| Employer (Lumen Studio) | `employer.lumen@hirestack.dev` |
| Candidate | `candidate.alex@hirestack.dev` … `candidate.quinn@hirestack.dev` |

Seed load: 1 admin, 3 employers/companies, 8 candidates, 25 skills, 20 published jobs, 18 applications.

## MCP deploy notes

1. **Neon MCP** — project `hirestack` (`divine-moon-46584975`). Schema applied with Prisma migrate; trigram indexes in `prisma/migrations/20260819160618_trgm_indexes`. Seed verified through `run_sql` / `inspect_database`.
2. Wire `apps/api/.env` with the pooled `DATABASE_URL` and unpooled `DATABASE_URL_UNPOOLED`.
3. **Vercel MCP / CLI** — create `hirestack-api` (root `apps/api`) and `hirestack-web` (root `apps/web`). There is no env-var MCP tool; set secrets with `vercel env add`.
4. Deploy API first, set `WEB_ORIGIN` to the Angular production URL, then deploy web.
5. Confirm `/api/health` returns `{ ok: true, db: true }` and `/api/docs` loads.

## Live URLs

- Web: _pending first production deploy_
- API: _pending first production deploy_
- Swagger: `{API}/api/docs`

## Trade-offs

- **SSR vs CSR.** Public job list, job detail, company profile, and landing render on the server so listings stay crawlable. Authenticated inbox and forms stay client-rendered.
- **Serverless Nest cold starts.** One Fluid Function is operationally simple. The cost is a wake-up on idle. Prisma uses the Neon adapter so the function does not hold a brittle TCP pool.
- **Postgres search vs dedicated search.** Trigram + `ILIKE` is enough for tens of thousands of jobs and keeps ranking next to relational filters. At marketplace scale, embeddings or OpenSearch would replace the relevance path only.

## What is next

Messaging threads, Stripe-backed featured jobs, and embedding search. Not in v1: chat, payments, AI matching, or a mobile app.

## License

Private portfolio project.
