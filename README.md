# WorkoutTracker

A workout & calorie tracking PWA for a small group of gym friends. Each person signs into their own account and gets day-wise workout logging against their own custom split days, calorie tracking (manual + LLM photo estimation), a personal daily deficit target, step data synced from their phone via an iOS Shortcuts bridge, and self-service control over their own logged history.

Live at **https://gym-tracker.sadif-ahmed.workers.dev**.

For the full design rationale — schema, RLS model, auth flow, LLM usage, deployment history — see [PWA_Workout_Tracker_Architecture_Plan.md](./PWA_Workout_Tracker_Architecture_Plan.md). This README is just the "get it running" reference.

## Tech stack

- **Vite + Preact** — build tooling and UI
- **Chart.js** — progress charts
- **Supabase** (Postgres + RLS, Auth, Edge Functions) — the entire backend
- **Cloudflare Workers** (static assets) — hosting

## Features

- Day-wise workout logging against custom split days, with per-set weight/reps or cardio duration
- Calorie-burn estimate per workout, computed from actual bodyweight + logged sets (MET math), with a one-time LLM classification per exercise
- Nutrition logging — manual entry or photo-to-calorie estimation (reviewed before saving)
- Daily calorie deficit target from BMR/TDEE (Mifflin-St Jeor) and logged weight
- Steps bridge — an iOS Shortcut syncs daily step count via a per-user token
- Progress charts (estimated 1RM trend per exercise)
- History with per-workout detail and deletion
- Self-serve signup gated by admin approval (no public database access until approved)
- Forgot / reset password flow
- Settings "Danger zone" — clear your own workout, nutrition, weight, or steps history independently
- In-app "How To Use" guide

## Getting started

### Prerequisites

- Node.js
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Docker (for `supabase start`'s local backend)

### Local development

```bash
npm install
supabase start          # runs the full backend locally in Docker
npm run dev              # serves over HTTPS on the LAN (vite + basic-ssl)
```

Copy `.env.example` to `.env.local` and fill in your Supabase project's URL and anon key. Note: this project's committed `.env.local` points at the **hosted** Supabase project by convention (not local Docker) — see the architecture plan's Section 3 and local-dev notes if you need to point the dev server at your local Supabase instance instead (a temporary `.env.development.local` overrides it without touching the committed file).

Apply migrations and serve edge functions locally:

```bash
supabase db reset                          # applies every migration in supabase/migrations/
supabase functions deploy <name> --no-verify-jwt   # only needed for ingest-steps
```

### Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server over HTTPS |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |

## Deployment

Deploys are manual — there's no CI/CD and no per-branch preview URL (see Section 15 of the architecture plan for why). To ship a change:

```bash
npm run build
CLOUDFLARE_API_TOKEN=<token> npx wrangler deploy
```

Then smoke-test the live URL in a real browser before considering the change done.

Database changes go out separately:

```bash
supabase db push                 # applies new migrations to the hosted project
supabase functions deploy <name> # redeploys a changed Edge Function
```

## Project structure

```
src/
├── auth/       # LoginView, PendingApprovalView, ResetPasswordView, authGuard
├── data/       # one module per table — thin wrappers over the Supabase client
├── services/   # calls into the llm-proxy Edge Function
├── utils/      # pure calculation logic (TDEE, calorie burn, steps, dates)
└── views/      # one folder per tab (today, nutrition, history, progress, goals,
                # manageSplitDays, settings, howto)
supabase/
├── migrations/ # every table + its RLS policies, in the order they were added
└── functions/  # llm-proxy, ingest-steps
```

See the architecture plan's Section 6 for the annotated version of this tree.
