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

- Day-wise workout logging against custom split days, with per-set weight/reps or timed duration; drag to reorder exercises
- Verified exercise catalog (muscle group, logging type, MET value) with an inline form tutorial video per exercise
- Ready-made training plans, plus upload-your-own plan (.md/.txt) parsed by the LLM
- Calorie-burn estimate per workout, computed from actual bodyweight + logged sets (MET math), with a one-time LLM classification per exercise
- Nutrition logging — manual entry or photo-to-calorie estimation (reviewed before saving)
- Daily calorie deficit target from BMR/TDEE (Mifflin-St Jeor) and logged weight
- Steps bridge — an iOS Shortcut syncs daily step count via a per-user token
- Progress: weekly summary vs last week, 12-week consistency grid and streak, sets per muscle group, recent PRs, and per-exercise charts (est. 1RM or minutes) with PR markers and time ranges
- Equipment scanner: photo of gym gear to suggested exercises, muscle group, target muscles and a form tip (LLM vision)
- History with per-workout detail and deletion
- Open self-serve signup; an admin can still block an account by setting `profiles.approved = false`
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
| `npm run check` | Assertion self-checks for the pure logic in `src/utils` and `src/data` (no Supabase needed) |

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

Without Docker running (the CLI bundles functions in Docker by default), deploy through the API instead: `SUPABASE_ACCESS_TOKEN=<token> npx supabase functions deploy <name> --project-ref <ref> --use-api`.

## Project structure

```
src/
├── auth/       # LoginView, PendingApprovalView, ResetPasswordView, authGuard
├── data/       # one module per table — thin wrappers over the Supabase client
├── services/   # calls into the llm-proxy Edge Function (food photo, equipment photo, MET, plan parsing)
├── utils/      # pure logic (TDEE, calorie burn, steps, dates, progress stats, photo downscaling)
└── views/      # one folder per tab (today, nutrition, history, progress, equipment,
                # goals, manageSplitDays, plans, settings, howto) + shared components
supabase/
├── migrations/ # every table + its RLS policies, in the order they were added
└── functions/  # llm-proxy, ingest-steps
```

See the architecture plan's Section 6 for the annotated version of this tree.
