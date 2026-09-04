# HumanWrite — Standalone Live Application

A structural writing studio with editorial intelligence. This is the standalone
web application (Sprint 1), migrated from the `HumanWrite6.html` prototype. It no
longer depends on the Claude artifact runtime; all AI calls go through this app's
own backend.

## Architecture

```
Browser (Next.js/React + Tiptap)
   │  fetch  /api/rewrite, /api/analyse, /api/editorial-question,
   │         /api/style-profile, /api/compare-styles, /api/documents, /api/health
   ▼
HumanWrite backend (Next.js route handlers)
   │  EditorialAIProvider  (src/lib/ai)
   ▼
Anthropic API   (server-side only; key never reaches the browser)
```

- **Frontend/editor:** Next.js 15 (App Router), React 19, Tiptap/ProseMirror.
- **Backend:** Next.js route handlers (`src/app/api/*`).
- **AI:** provider abstraction (`EditorialAIProvider`) with an `AnthropicProvider`.
- **Database:** PostgreSQL via Prisma.
- **Auth:** Supabase Auth (optional in local dev).
- **Intelligence:** local deterministic diagnostics (Layer 1) + retrieved
  principles supplied to the model (Layers 2–3). No model retraining.

## Hybrid intelligence

- **Layer 1 (local, offline):** sentence splitting, repeated openings, grammatical
  opening archetype, repeated words, formulaic phrases, empty-storytelling and
  conceptual-repetition candidates. Runs in the browser via
  `src/lib/diagnostics/engine.ts`. Works with no network, so Review never breaks.
- **Layer 2 (semantic):** `/api/analyse` for meaning-level judgement, returning
  validated JSON.
- **Layer 3 (generative):** `/api/rewrite`, `/api/compare-styles`.

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Server-side model key. Never exposed to the browser. |
| `AI_PROVIDER` | `anthropic` (default). |
| `EDITORIAL_MODEL` / `FAST_MODEL` / `DEEP_REVIEW_MODEL` | Model routing by task depth. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth. Anon key is browser-safe; no service key is used client-side. |

### Getting an Anthropic API key

1. Go to the Anthropic Console (console.anthropic.com).
2. Create an API key under **API Keys**.
3. Put it in `.env` as `ANTHROPIC_API_KEY`. It is read only on the server.

## Local development

```bash
npm install
cp .env.example .env      # then edit .env
npx prisma db push        # create tables in your DATABASE_URL
npm run dev               # http://localhost:3000
```

Without `DATABASE_URL`/Supabase, the app still runs: Review and local diagnostics
work; document persistence and voices require the database and auth.

## Staging / production deploy (Vercel)

1. Push this repo to GitHub.
2. In Vercel, **New Project** → import the repo.
3. Add all environment variables from `.env.example` in Vercel project settings.
4. Provision managed PostgreSQL (Supabase, Neon, or Vercel Postgres) and set
   `DATABASE_URL`.
5. Deploy. The build runs `prisma generate && next build`.
6. After first deploy, run `npx prisma db push` against the production database
   (or add a migration step).

The same codebase serves local, staging and production; only env vars differ.

## Health

`GET /api/health` reports app, database and AI-provider status without exposing
secrets, distinguishing AI-unavailable from database-down.

## Security & privacy

- API keys are server-only environment variables.
- Requests are validated (Zod), rate-limited, and size-limited.
- Usage is recorded (tokens, cost, latency) but document contents are never
  logged.
- Voice profiles store derived characteristics only; raw samples are discarded
  after analysis and never re-sent.

## Graceful degradation

If the AI provider is unavailable, `/api/*` AI routes return 503 with a clear
message, the client keeps local Review and editing working, and no text is lost
or overwritten.
