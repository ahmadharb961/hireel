# Hireel

Video-first talent marketplace for Lebanon and the GCC. Candidates record short intro videos; employers discover them in a vertical reels feed. English and Arabic (right-to-left).

- **Plan and phases:** [PLAN.md](PLAN.md)
- **Where we are:** [PROGRESS.md](PROGRESS.md)
- **Putting it online (non-technical guide):** [docs/SETUP.md](docs/SETUP.md)
- **Product spec and approved designs:** [docs/](docs/)

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 · PostgreSQL + Prisma 7 · Better Auth (email/password, verification, reset, admin TOTP) · Cloudflare Stream (tus uploads, signed HLS playback, webhooks) · SMTP email (Hostinger) · next-intl (en/ar) · hand-written service worker (PWA).

## Run it locally (developers)

```bash
cp .env.example .env              # fill DATABASE_URL etc.
npm install
npx prisma migrate deploy         # create tables
npm run db:setup                  # default plans
npm run demo:seed                 # optional, clearly labeled demo candidates
npm run make-admin -- you@example.com "Your Name"
npm run dev
```

Without SMTP settings, development emails are written to `.dev-mail/` instead of being sent. Without Cloudflare settings, the video studio says uploads aren't switched on (nothing is faked).

## Tests

```bash
npm test             # rules + database tests (uses the hireel_test database)
npm run test:e2e     # browser tests against a running server on :3100 (see playwright.config.ts)
```

## Useful commands

| Command | What it does |
|---|---|
| `npm run db:migrate` | Apply database changes (production) |
| `npm run db:setup` | Create the Freemium and Premium plans if missing |
| `npm run make-admin -- email "Name"` | Create or promote a Super Admin |
| `npm run demo:seed` / `npm run demo:clear` | Add / remove demo data (never touches real data) |
| `npm run stream:setup -- https://domain` | Create the Cloudflare signing key and webhook |

## Project layout

```
src/app/          screens and API routes (candidate/, employer/, feed/, admin/, p/[token] share page, api/)
src/server/       server-only logic: permissions, feed, requests, plans, videos, Cloudflare
src/server/rules/ pure rules with unit tests (views, plans, share tokens, bots)
src/components/   shared UI (player, nav, sheets, install banner)
messages/         en.json, ar.json
prisma/           schema and migrations
scripts/          setup, admin, demo data, icons, Cloudflare setup
tests/            unit, integration (database), e2e (browser)
docs/             spec, approved designs, setup guide
```
