# HackerOne Scout

A tool that watches HackerOne for bug bounty programs open for submissions, lets you approve which ones to pursue, pulls the real in-scope/out-of-scope assets, generates a manual testing checklist with Claude, and helps you draft a submission-ready report once you find something.

You do the actual testing by hand — this tool handles discovery, scope-checking, and paperwork.

## What's in here

```
apps/web/    the web app you use day to day (React + Vite)
apps/api/    the backend it talks to (Express, deploys as Vercel serverless functions)
packages/db/              the database schema (Postgres via Drizzle)
packages/api-client-react/ generated code that lets the web app talk to the api
```

## One-time setup

You'll need three free accounts: a place to run this code from (your computer, via a terminal), a database (Supabase), and hosting (Vercel).

### 1. Install the tools

- Install [Node.js](https://nodejs.org) (the LTS version).
- Install `pnpm`: open a terminal and run `npm install -g pnpm`.

### 2. Get your API keys

| What | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `H1_API_USERNAME` + `H1_API_TOKEN` | hackerone.com → your account (top-right icon) → Settings → API Token |
| `DATABASE_URL` | supabase.com → New Project → once created, Project Settings → Database → Connection string (copy the "URI" one) |

### 3. Set up the database

```
pnpm install
cp .env.example apps/api/.env
# paste your DATABASE_URL, ANTHROPIC_API_KEY, H1_API_USERNAME, H1_API_TOKEN into apps/api/.env
pnpm db:push
```

That last command creates the tables in your Supabase database. You only need to run it again if the schema changes.

### 4. Run it locally to check everything works

Open two terminal windows/tabs:

```
# terminal 1
pnpm dev:api

# terminal 2
pnpm dev:web
```

Open the URL the second command prints (usually http://localhost:5173). You should see the app. Try clicking "Scan for new programs" — if it finds programs, your setup is working.

## Deploying (Vercel + Supabase)

You'll create **two** Vercel projects from this same GitHub repo — one for `apps/web`, one for `apps/api`. This is normal for a split frontend/backend and Vercel supports it directly.

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. On vercel.com, click **Add New → Project**, pick this repo.
   - **Root Directory**: `apps/api`
   - Framework preset: Other
   - Add Environment Variables: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `H1_API_USERNAME`, `H1_API_TOKEN`
   - Deploy. Note the URL Vercel gives you (e.g. `https://bounty-scout-api.vercel.app`).
3. Click **Add New → Project** again, same repo.
   - **Root Directory**: `apps/web`
   - Framework preset: Vite
   - Add Environment Variable: `VITE_API_URL` = the URL from step 2
   - Deploy.
4. Visit the web project's URL — that's your app.

If something doesn't come up right on the first deploy, that's normal for a first pass — send me the error from Vercel's deploy log and we'll fix it together.

## Day-to-day use

- **Programs** page: click **Scan for new programs** to check HackerOne for newly open programs (or wait — nothing bad happens if you never click it, it just means you're finding programs manually).
- New finds show up in a "waiting for your approval" box. **Approve** starts real scope analysis + a testing checklist. **Skip** archives it.
- Go test the approved program by hand using the checklist.
- When you find something, log it as a Finding — Claude drafts the report.
- Review the draft, then submit it yourself on HackerOne (this version doesn't auto-submit — see below).

## What this version does and doesn't do

- ✅ Finds open HackerOne programs automatically (or on your click)
- ✅ Requires your approval before doing anything with a program
- ✅ Pulls real in-scope/out-of-scope data from HackerOne (not a guess)
- ✅ Drafts a structured report from your plain-language description
- ❌ Does not automatically submit reports to HackerOne — you review and submit yourself for now
- ❌ Does not automatically check on submitted reports' status yet
- ❌ Does not run the discovery scan on its own schedule — you (or a Vercel Cron job, if you add one later) trigger it

## Environment variables reference

See `.env.example` at the repo root (for `apps/api`) and `apps/web/.env.example` (for the web app).
