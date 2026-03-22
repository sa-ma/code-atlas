# Code Atlas

Code Atlas is a monorepo with a Next.js frontend and a NestJS backend. It analyzes public GitHub repositories, generates an architecture map, and lets signed-in users save past analyses.

## Workspace Layout

```text
apps/
  web/        # Next.js frontend
  api/        # NestJS + Fastify backend
packages/
  shared/     # shared API contracts and analysis types
```

## Stack

- `apps/web`: Next.js 16, React 19, Tailwind CSS 4, Mermaid
- `apps/api`: NestJS 11, Fastify, Better Auth, Prisma, Postgres
- `packages/shared`: shared TypeScript types for frontend/backend contracts

## Local Development

1. Install dependencies:

```bash
pnpm install
```

2. Copy env templates:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

3. Fill in the required values:

- `apps/api/.env`
  - `DATABASE_URL`
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL` as the canonical Better Auth origin, for example `http://localhost:4000` locally and `https://api.codeatlas.gidalabs.com` in production
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `FRONTEND_PUBLIC_URL`
  - `BACKEND_PUBLIC_URL`
  - `CORS_ALLOWED_ORIGINS`
  - `COOKIE_DOMAIN` for shared production/staging subdomains
  - `GITHUB_TOKEN` for GitHub repository analysis
- `apps/web/.env.local`
  - `NEXT_PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_APP_URL`

1. Generate Prisma Client:

```bash
pnpm --filter @code-atlas/api prisma:generate
```

If you change the Better Auth config, regenerate the auth schema baseline first:

```bash
pnpm --filter @code-atlas/api auth:generate
pnpm --filter @code-atlas/api prisma:generate
pnpm --filter @code-atlas/api prisma:migrate
```

5. Run both apps:

```bash
pnpm dev
```

- frontend: `http://localhost:3000`
- backend: `http://localhost:4000`

## Backend Endpoints

Public endpoints:

- `GET /health`
- `POST /api/analyze`
- Better Auth routes under `/api/auth/*`

Authenticated endpoints:

- `GET /api/me`
- `GET /api/analyses`
- `GET /api/analyses/:id`
- `POST /api/analyses`
- `DELETE /api/analyses/:id`

## Auth Model

- GitHub is the only enabled sign-in provider.
- Better Auth runs in the NestJS backend and is hosted on the API origin, not the frontend origin.
- `BETTER_AUTH_URL` is the source of truth for Better Auth callback generation.
- Cookie settings come from environment-driven backend configuration.
- When `COOKIE_DOMAIN` is set, Better Auth enables shared subdomain cookies.
- In local development, leave `COOKIE_DOMAIN` empty to use host-only cookies.
- The frontend redirects users to backend auth endpoints under `/api/auth/*` and then calls authenticated backend routes with browser credentials included.

## Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm --filter @code-atlas/api test
pnpm typecheck
pnpm --filter @code-atlas/api auth:generate
pnpm --filter @code-atlas/api prisma:generate
pnpm --filter @code-atlas/api prisma:migrate
```
