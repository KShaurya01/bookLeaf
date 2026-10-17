# BookLeaf Author Support Portal

Take-home for BookLeaf Publishing. Authors can see their books/royalties and raise tickets; ops can triage those tickets with AI help for category, priority, and a draft reply.

## Run locally

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

App runs at http://localhost:3000

I used SQLite so you don't need Docker just to try it. Schema is normal relational stuff — flip `provider` to `postgresql` and point `DATABASE_URL` at Neon/Supabase if you want Postgres.

### Env

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="anything-long-and-random"
OPENAI_API_KEY=          # optional
OPENAI_MODEL=gpt-4o-mini
```

If there's no OpenAI key (or the API is down / out of credits), tickets still create. Classification and drafts fall back to a small rule-based helper so the demo doesn't die mid-review.

## Logins

| Who | Email | Password |
|-----|-------|----------|
| Admin | admin@bookleafpub.com | admin123 |
| Author | priya.sharma@email.com | author123 |

Every seeded author password is `author123`. Seed data is the JSON from the assignment (10 authors, 18 books).

## What's in the app

**Author**
- login (email/password), only your own data
- My Books — sales + royalty fields from the sample set
- raise a ticket (pick a book or General; attachment field is UI-only)
- My Tickets + live refresh when someone replies

**Admin**
- queue with filters (status / category / priority / date)
- AI category + priority on new tickets (overrideable)
- Generate draft → edit → send
- status, assign-to-me, internal notes (authors don't see notes)

## How it's built

- Next.js 15 (App Router) for UI + API routes
- Prisma + SQLite
- JWT in an httpOnly cookie (`AUTHOR` / `ADMIN`)
- OpenAI `gpt-4o-mini` for classify + draft
- SSE for near-realtime ticket updates (no Redis — fine for a single process)

Rough flow:

```
UI  →  /api/*  →  DB
            ↘
          OpenAI / fallback
            ↘
           SSE
```

A few notes on the AI bit:
- draft prompts only get the KB slice for that category, plus a small book/royalty snapshot — not the entire KB + full history every time
- ticket create never waits on OpenAI; we classify quickly first and refine in the background when a key is present
- key stays server-side only

## API

OpenAPI spec: `docs/openapi.yaml`  
Postman: `docs/postman_collection.json`

| Method | Path | Notes |
|--------|------|-------|
| POST | /api/auth/login | sets cookie |
| POST | /api/auth/logout | |
| GET | /api/auth/me | |
| GET | /api/books | scoped by role |
| GET/POST | /api/tickets | list / create |
| GET/PATCH | /api/tickets/:id | |
| POST | /api/tickets/:id/messages | admin reply |
| POST | /api/tickets/:id/notes | internal |
| POST | /api/tickets/:id/draft | AI draft |
| GET | /api/tickets/:id/events | SSE |
| GET | /api/events/queue | SSE for list/queue |

## Deploy

See `DEPLOY.md`. Short version for local prod mode:

```bash
npm run build
npm start
```

For a public URL I'd use Vercel + Neon (Postgres). Put `DATABASE_URL`, `JWT_SECRET`, and `OPENAI_API_KEY` in the host env.

## Stuff I'd do with more time

- real file uploads (S3) for print-quality complaints
- Redis (or similar) if you run more than one server instance — current SSE is in-memory
- email when a ticket gets a reply
- better evals on classification accuracy

Went with `gpt-4o-mini` because these are short support drafts and ops still edits before send — no need to burn a bigger model on every ticket.
