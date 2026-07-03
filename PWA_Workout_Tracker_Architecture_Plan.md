# Workout & Calorie Tracker — Multi-User PWA Architecture Plan

**Revision note:** Updated for the actual scope — you plus a handful of gym friends, with the app evolving based on their feedback given directly to you (not through an in-app channel). This keeps everything from the previous multi-user revision (Supabase auth, Postgres + RLS, per-user isolation) and adds what a small-trusted-group workflow actually needs: closed signups, a safe way to ship changes without disrupting people mid-use, and self-service control over their own logged history.

---

## 1. App Concept (in one line)
A PWA for you and your gym friends — each signs into their own account and gets day-wise workout logging against their own custom split days, calorie tracking (manual + LLM photo estimation), a personal daily deficit target, step data from their own watch via an iOS Shortcuts bridge, an in-app how-to-use guide, and the ability to clear their own logged history by category whenever they want.

---

## 2. Recommended Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Build tooling | **Vite** + `vite-plugin-pwa` | Unchanged |
| UI | **Preact** | Unchanged |
| Charts | **Chart.js** | Unchanged |
| Static hosting | **Cloudflare Workers** (static assets, free) | Deployed via manual `wrangler deploy`, not Cloudflare Pages' Git integration — see Section 15 for why, and how safety works without automatic per-branch previews |
| Auth + database + server functions | **Supabase** (free tier) | Unchanged reasoning: don't hand-roll auth; Postgres + RLS gives per-user isolation enforced by the database itself |
| Local storage | IndexedDB, optional read-only cache | Unchanged — server is the source of truth |
| Backup/portability | *None* | Descoped by request (Section 14) — no JSON export/import exists; revisit as its own phase if it's ever actually needed |

**Scale check for "me + gym friends":** Supabase free tier (500MB DB, 50K MAU) and Cloudflare Workers' free tier aren't just "enough" here, they're wildly oversized for 5-15 people. Nothing in this plan needs to change if the group grows to a few dozen; you'd only revisit the stack if this became a genuinely public product.

---

## 3. Building From Ubuntu — Still Simple

- `npm run dev`, test on iPhone over LAN HTTPS (`@vitejs/plugin-basic-ssl`), deploy via `npm run build && wrangler deploy` — manual, not an automatic `git push` trigger (see Section 15).
- Secure-context gotcha still applies (no service worker / no `crypto.randomUUID()` over plain HTTP) — keep basic-ssl and the `generateId()` fallback.
- Supabase CLI (`supabase start`) runs the full backend locally in Docker for development; push migrations to the hosted project when ready.

---

## 4. Data Architecture: Server-Authoritative, Online-First

Unchanged from the previous revision: the app reads/writes directly against Supabase, online-first, no offline sync engine in v1. This remains the right call at this scale — conflict resolution is real complexity you don't need for a small group logging from their phones with normal connectivity. A read-only IndexedDB cache for offline *viewing* is a reasonable v2 add if someone's gym has bad signal.

---

## 5. Database Schema (Postgres + RLS)

Same eight tables as before, plus one new table for feedback.

```sql
create table split_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  split_day_id uuid references split_days(id) on delete set null,
  name text not null,
  muscle_group text not null,
  default_sets int,
  default_rep_range text,
  is_cardio boolean not null default false,
  sort_order int not null default 0
);

create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  split_day_id uuid references split_days(id) on delete set null,
  split_day_name_snapshot text not null,
  notes text,
  start_time timestamptz,
  end_time timestamptz,
  estimated_calories_burned int
);

create table set_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete set null,
  exercise_name_snapshot text not null,
  set_number int not null,
  reps int not null,
  weight_kg numeric,
  duration_seconds int
);

create table food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  meal_type text not null,
  name text not null,
  calories int not null,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  source text not null default 'manual',
  confirmed boolean not null default true
);

create table weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric not null
);

create table user_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age_years int not null,
  biological_sex_for_bmr text not null,
  height_cm numeric not null,
  starting_weight_kg numeric not null,
  target_weight_kg numeric not null,
  weekly_loss_rate_kg numeric not null,
  activity_level text not null
);

create table daily_steps (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  steps int not null,
  synced_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- New: feedback channel (Section 13)
create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  screen text,                         -- which view they were on — helps triage
  created_at timestamptz not null default now(),
  status text not null default 'new'   -- new|planned|done|wontfix — you triage by editing this
);
```

### Row Level Security — same pattern on every table, including `feedback`

```sql
alter table workout_sessions enable row level security;
create policy "own rows select" on workout_sessions for select using (auth.uid() = user_id);
create policy "own rows insert" on workout_sessions for insert with check (auth.uid() = user_id);
create policy "own rows update" on workout_sessions for update using (auth.uid() = user_id);
create policy "own rows delete" on workout_sessions for delete using (auth.uid() = user_id);
-- repeat for exercises, split_days, set_entries, food_entries, weight_entries, user_goals, daily_steps

alter table feedback enable row level security;
create policy "own feedback insert" on feedback for insert with check (auth.uid() = user_id);
create policy "own feedback select" on feedback for select using (auth.uid() = user_id);
-- deliberately no update/delete policy for users — feedback is append-only from their side;
-- you triage by editing `status` yourself via the Supabase dashboard (service role bypasses RLS)
```

This is enforced in the database itself, so even a front-end bug can't leak one friend's data to another. Non-negotiable, lands in the same migration as its table — never a follow-up phase.

### Table grants — required alongside RLS, easy to miss

RLS policies only filter *which rows* a role can touch; Postgres still requires the base table-level privilege (`GRANT`) before that filtering ever runs. Tables created through the Supabase dashboard's Table Editor get this wired up for you automatically — tables created via CLI migrations (as this project does) do **not**. Skipping it doesn't fail loudly in a way that looks related: every request from `authenticated` comes back `403 permission denied for table ...`, which reads like an RLS problem but isn't one. Learned this the hard way when Phase 3 testing caught it on tables that had shipped in Phase 2 with RLS enabled and policies attached, but no grants — so nothing had actually been reachable by a real logged-in user the whole time.

```sql
grant select, insert, update, delete on
  split_days, exercises, workout_sessions, set_entries,
  food_entries, weight_entries, user_goals, daily_steps
to authenticated;

grant select, insert on feedback to authenticated;
```

Land this in the same migration as the table + its RLS policies, same rule as everything else in this section.

**Seeding:** per-user on first login (client-side: if the new user has zero `split_days`, insert the default 3-day template), not at deploy time.

**Later additive migrations** (not shown above — `supabase/migrations/` is the source of truth for exact DDL): `exercises.met_value` (Section 9, cached LLM MET classification), `profiles.bridge_token` + `regenerate_bridge_token()` (Section 11, steps-bridge auth), and an `llm_usage` table backing the per-user daily LLM call cap (Section 9). Same rule applies to every one of them — RLS + grants land in the same migration as the change.

### Admin-approval gating (`profiles` table)

Revision note: this project moved from invite-only magic-link auth to **self-serve email+password signup gated by admin approval** — see Section 12 for why. That means RLS on the eight data tables above is no longer just `auth.uid() = user_id`; it also requires the signed-in user to be an *approved* user, otherwise anyone who signs up (approved or not) could hit the API directly with their own valid session and bypass the "pending approval" screen, which is a UI convenience, not a security boundary on its own.

```sql
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "own profile select" on profiles for select using (auth.uid() = user_id);
grant select on profiles to authenticated;

-- auto-create an unapproved profile row on signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- re-scope every data-table policy to also require approval
create function public.is_approved()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select approved from public.profiles where user_id = auth.uid()), false);
$$;

-- e.g. for split_days (repeat per table):
drop policy "own rows select" on split_days;
create policy "own rows select" on split_days
  for select using (auth.uid() = user_id and public.is_approved());
-- ...same auth.uid() = user_id and public.is_approved() addition on insert/update/delete
```

`feedback` is deliberately left ungated by approval — a pending user should still be able to ask "why haven't you approved me yet."

**Triage:** approving a user is a single `update profiles set approved = true where email = '...'` run from the Supabase dashboard's table editor or SQL editor — same manual-triage pattern already used for `feedback.status`.

---

## 6. App Architecture (File Structure)

```
workout-tracker/
├── index.html
├── vite.config.js
├── public/icons/
├── supabase/
│   ├── migrations/                  // tables + RLS, including feedback (schema only — no UI, Section 13)
│   └── functions/
│       ├── llm-proxy/index.ts
│       └── ingest-steps/index.ts
├── src/
│   ├── main.jsx
│   ├── lib/supabaseClient.js
│   ├── auth/
│   │   ├── LoginView.jsx            // email+password, self-serve signup + forgot-password — Section 12
│   │   ├── PendingApprovalView.jsx  // shown to signed-in but not-yet-approved users
│   │   ├── ResetPasswordView.jsx    // shown during a PASSWORD_RECOVERY session, Section 12
│   │   └── authGuard.js             // useSession(), useApproval(), usePasswordRecovery(), signOut()
│   ├── data/
│   │   ├── splitDays.js  exercises.js  workoutSessions.js  setEntries.js
│   │   ├── foodEntries.js  weightEntries.js  userGoal.js  dailySteps.js
│   │   ├── profile.js               // bridge_token read/regenerate, Section 11
│   │   ├── feedback.js              // dead code — table exists, UI descoped, Section 13
│   │   └── firstLoginSeed.js
│   ├── services/
│   │   ├── calorieEstimation.js
│   │   └── exerciseCalorieBurn.js   // classify_exercise_met LLM call, Section 9
│   ├── utils/
│   │   ├── tdeeCalculator.js  stepCalorieCalculator.js  progressionAnalyzer.js
│   │   ├── calorieBurnCalculator.js // deterministic MET math, Section 9
│   │   ├── generateId.js  dates.js
│   └── views/
│       ├── today/ history/ progress/ nutrition/
│       ├── manageSplitDays/ goals/
│       ├── settings/                // account, steps-bridge setup, danger zone (Section 13)
│       └── howto/                   // static "how to use" guide tab, Section 14
└── package.json
```

---

## 7. Auth Flows & Managing Split Days

Supabase's client handles sessions end to end; `authGuard.js` exposes `useSession()` (undefined while checking, `null` signed out, a `Session` when signed in) and `useApproval(session)` (undefined while checking, then `true`/`false` from `profiles.approved`). `App.jsx` gates on both in sequence: no session → `LoginView`; session but not approved → `PendingApprovalView`; both → the real app. Split-day deletion still prompts before touching exercises, snapshots keep history readable through renames/deletes. See Section 12 for the auth model itself (email+password, self-serve signup, admin approval).

---

## 8. The "Progress Insight" Logic
Unchanged — pure functions over fetched rows, automatically per-user via RLS.

---

## 9. LLM Calls: Photo-to-Calorie & Exercise Burn

Both calls go through the same auth-checked Edge Function (`llm-proxy`), key stored as a Supabase secret, per-user daily call cap (`llm_usage` table + `increment_llm_usage()`) as insurance — not about distrust, it's a cheap guard against a runaway bug (e.g. a retry loop) burning your LLM budget while you're not watching.

**Photo-to-calorie:** unchanged from the original design — a vision model estimates name/calories/macros from a food photo, photos are never persisted, and the result is always reviewed before saving to `food_entries`.

**Exercise burn — rearchitected from a session-level estimate to per-set MET math:** the original design asked the LLM to estimate total calories burned for an entire session from a text summary (e.g. "Bench Press: 4 sets..."). That's been replaced with a deterministic calculation — `calories = MET × bodyweight_kg × hours` — computed client-side (`src/utils/calorieBurnCalculator.js`) from each exercise's actual logged weight/reps or cardio duration. The LLM's only remaining job is classifying an exercise's MET value once, ever, via a `classify_exercise_met` action, cached on `exercises.met_value` (Section 5) — so a repeat workout using already-classified exercises needs no LLM call at all. The per-exercise breakdown + total is shown for review before saving to `workout_sessions.estimated_calories_burned`, same review-before-save principle as the photo estimate.

---

## 10. Calorie Deficit Tracking
Unchanged — Mifflin-St Jeor BMR + activity multiplier, per-user from their own `user_goals` and latest `weight_entries`.

---

## 11. Steps Bridge (iOS Shortcuts) — Per-User
Unchanged — each friend gets their own `bridge_token`, sets up their own Shortcut on their own phone, staleness label shown, workout-window exclusion remains a documented approximation.

---

## 12. Self-Serve Signup, Gated by Admin Approval

**Revision note:** the original design here was invite-only magic-link auth (Supabase dashboard invites new users, self-serve signup disabled). That's been replaced with email+password self-serve signup where anyone can create an account, but a new account can't actually read or write any workout/nutrition data until the project owner approves it. Functionally the same outcome (only people you've vetted can use the app), but signup no longer runs through the dashboard, and there's a real "pending" state a new user sits in rather than never having an account at all.

**How it works:**
1. A friend opens the app and signs up with their own email + password from `LoginView.jsx` — this creates a normal Supabase auth user immediately, same as any public app.
2. A database trigger (`handle_new_user`, Section 5) fires on every new `auth.users` row and inserts a matching `profiles` row with `approved = false`. This happens server-side, unconditionally — there's no client code path that skips it.
3. The signed-in-but-unapproved user sees `PendingApprovalView.jsx` instead of the app. But that screen is just UX — the actual gate is server-side: every RLS policy on the eight data tables requires `public.is_approved()` in addition to row ownership (Section 5), so an unapproved user hitting the API directly gets a `42501 permission denied for table ...` / RLS-violation error, not just a blocked UI.
4. You approve someone by running `update profiles set approved = true where email = '...'` from the Supabase dashboard's SQL editor or table editor — no extra UI needed, matches how `feedback.status` is already triaged.

**Why this instead of the original invite-only design:** it removes the manual "go into the dashboard and invite each person" step — friends can just go to the URL and sign up themselves, and you approve on your own schedule instead of being a blocker on the first step. The trade-off is that Supabase's own "Allow new users to sign up" toggle needs to stay **on** (the opposite of the original recommendation) since self-serve signup is now load-bearing — the approval gate does the job that toggle used to do.

**A gap worth knowing about:** email confirmation. Supabase's default `signUp` flow requires the user to click a confirmation link in their email before they get a session — that's an existing anti-bot/anti-typo layer that stacks with admin approval, not a replacement for it. If confirmation is disabled on the project (or the friend never checks their email), the account still can't touch any real data until you approve it, so there's no security gap either way — just a UX one worth being aware of if signups seem to "hang."

If this later needs an in-app admin screen (approve/reject buttons instead of the dashboard) or a "why was I rejected" notification back to the user, both are reasonable v2 additions — not needed while it's just a handful of people you already know.

**Forgot / reset password:** `LoginView.jsx` has a "Forgot password?" link (sign-in mode only) that calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })` — the response is identical whether or not the email is registered, so the UI can't be used to enumerate accounts. Clicking the emailed link brings the user back to the app with a recovery session; the Supabase JS client fires a `PASSWORD_RECOVERY` auth event (caught by `usePasswordRecovery()` in `authGuard.js`) which `App.jsx` checks *before* its normal session/approval branching, rendering `ResetPasswordView.jsx` (a plain `supabase.auth.updateUser({ password })` call) instead of dropping the user straight into the app on that temporary session.

**Deployment note:** `resetPasswordForEmail`'s `redirectTo` must match an entry in the Supabase project's Redirect URLs allow-list or GoTrue silently falls back to the configured Site URL instead. Local dev's `additional_redirect_urls` (Section 3) covers `https://localhost:5173`; the **hosted project's** Site URL / Redirect URLs (Supabase dashboard → Authentication → URL Configuration) need `https://gym-tracker.sadif-ahmed.workers.dev` added separately — that's a dashboard-only setting, not something a migration or `config.toml` change can reach.

---

## 13. Clearing Your Own History (Danger Zone)

**Revision note:** replaces the original "Feedback Loop" section — descoped by request. The `feedback` table and its RLS/grants (Section 5) remain in the schema (harmless, unused) since they landed as part of the core Phase 2 migration alongside every other table, but no feedback UI is being built. Collect input via your existing group chat instead of an in-app channel.

Settings gets a "Danger zone" with four independent, self-service delete actions, each confirmed separately:

- **Clear workout history** — deletes every `workout_sessions` row for the signed-in user; `set_entries` cascade via their FK, so this alone clears an entire workout history.
- **Clear nutrition log** — deletes every `food_entries` row.
- **Clear weight log** — deletes every `weight_entries` row.
- **Clear steps history** — deletes every `daily_steps` row.

None of these touch `split_days`, `exercises`, `user_goals`, or `profiles` — this clears *logged history*, not your setup or account config. Every delete is scoped with an explicit `.eq('user_id', userId)` in addition to the RLS policy already restricting it to `auth.uid() = user_id`, so this is pure user self-service, not an admin tool — there's no server-side "delete any user's data" path. No soft-delete/undo: the confirmation dialog is the only safety net, matching the pattern already used for deleting a single workout in History.

---

## 14. How-to-Use Tab

**Revision note:** replaces the original "Export / Import JSON" section — descoped by request; no backup/restore feature is being built. If this becomes needed later, revisit as its own phase rather than reviving this one, since nothing here depends on it.

A static "How To Use" tab, always in the main nav, walks through what each other tab does — Today, Nutrition, History, Progress, Goals, Split Days, Settings. No data fetching, no external content — just plain copy shipped with the app, so it can't drift out of sync with a wiki or doc nobody opens. This doubles as the answer to "how do I do X" questions for a small group, in place of the in-app feedback channel that Section 13 explicitly isn't building.

---

## 15. Iterating Safely: Staging, Deploys, and Not Disrupting Your Friends Mid-Set

This is the part that matters most for "build upon it based on feedback" specifically.

### No automatic preview deployments — deploy straight to production, smoke-test after
The original plan here assumed Cloudflare Pages' automatic per-branch preview URLs. In practice, setting that up in the Cloudflare dashboard produced a **Workers** project instead of a Pages one (the generated deploy command was `wrangler deploy`, not `wrangler pages deploy`, and its build queue stalled indefinitely at "Initializing build environment") — so this project deploys as a **Cloudflare Worker serving static assets**, pushed manually with `npm run build && wrangler deploy` straight to `https://gym-tracker.sadif-ahmed.workers.dev`. There is no separate preview URL per branch, and the team works directly on `master`.

The practical substitute: after every push to `master`, deploy and then smoke-test the live URL with a real browser (Playwright) — confirm it boots cleanly, the login view renders, no console/page errors. This isn't a pre-merge gate the way a true preview URL would be, but it catches a broken deploy before anyone else notices, and stays lightweight enough for a small group. Full authenticated-flow testing (sign up, log a workout, clear history, etc.) stays local-only against the disposable local Supabase stack, run before the deploy — never against production.

If this project ever needs real pre-merge previews, revisit as a dedicated Cloudflare Pages project (delete/recreate via "Workers & Pages → Create → Pages → Connect to Git") rather than trying to configure previews onto the current Workers setup.

**Point both local dev and production at the same Supabase project** for simplicity (it's still just your data + your friends', low risk) unless you're testing a schema migration you're unsure about — for those, spin up a second free Supabase project temporarily rather than risk a bad migration against real data.

### Don't silently swap versions under an active user
Not yet implemented — this was bundled into the old Phase 13, which is descoped (Section 13). Still worth doing whenever deploy-time glitches actually show up in practice: service workers update in the background by default, which can otherwise cause a confusing mid-session state (half-old, half-new code). Add a small listener:
```js
// utils/swUpdateListener.js
navigator.serviceWorker.ready.then(reg => {
  reg.addEventListener('updatefound', () => {
    const newWorker = reg.installing;
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        showUpdateToast(); // "New version available — tap to refresh"
      }
    });
  });
});
```
Simple, and it's the difference between friends trusting the app and friends hitting a weird bug mid-set because of a background update.

### Telling people what changed
Nothing fancy — a `CHANGELOG.md` in the repo, or just a message in whatever group chat you already use with them. Match the process weight to the group size: this should stay lightweight.

---

## 16. Suggested Build Order for Claude Code

**Phase 1 — Scaffold + Supabase project**
- Vite + Preact + `vite-plugin-pwa` + basic-ssl; Supabase project + local dev; static shell deployed as a Cloudflare Worker (static assets) — see Section 15 for why Pages didn't pan out

**Phase 2 — Schema + RLS migrations**
- All nine tables (Section 5) including `feedback`, RLS + four policies per table in the same migration as its table

**Phase 3 — Auth, self-serve signup with admin approval**
- `LoginView.jsx` (email+password, sign in/sign up), `PendingApprovalView.jsx`, `authGuard.js` (`useSession`, `useApproval`, `signOut`) — plus the `profiles` table, `handle_new_user` trigger, and `is_approved()`-gated RLS on every data table (Section 5/12). Self-serve signup stays **enabled** on the Supabase project — approval is the actual gate, not the dashboard toggle.

**Phase 4 — First-login seed + data modules**
- `firstLoginSeed.js`, `src/data/*` modules, `generateId()` + local-timezone `todayISO()`

**Phase 5 — Today/logging flow** (MVP moment)

**Phase 6 — Manage split days & exercises**

**Phase 7 — History**

**Phase 8 — Progress charts**

**Phase 9 — Nutrition manual logging + goals + TDEE/deficit**

**Phase 10 — LLM proxy Edge Function + photo-to-calorie + exercise burn**

**Phase 11 — Steps bridge**
- Per-user `bridge_token` on `profiles` + `regenerate_bridge_token()`, `ingest-steps` Edge Function (auth'd via the token, `verify_jwt = false`), Settings view exposing the token + Shortcut setup instructions, steps + estimated burn + sync-freshness shown in Nutrition

**Phase 12 — Clear-history (danger zone) + How-to-use tab**
- `deleteAllWorkoutSessions`/`deleteAllFoodEntries`/`deleteAllWeightEntries`/`deleteAllDailySteps` data functions, a Settings "Danger zone" section wired to them (Section 13), and a static "How To Use" tab (Section 14)

**Phase 13 — Forgot / reset password**
- "Forgot password?" link + `resetPasswordForEmail` in `LoginView.jsx`, `usePasswordRecovery()` in `authGuard.js`, `ResetPasswordView.jsx` (Section 12) — plus the hosted project's Redirect URLs allow-list needs `https://gym-tracker.sadif-ahmed.workers.dev` added via the dashboard for this to work in production

Once Phase 13 is done, point your friends at the app and approve their accounts as they sign up (Section 12 of the auth model, not this build-order phase) and you're in steady-state: branch → push → deploy → smoke test → friends get it next time they open the app. There's no in-app feedback channel — collect input via your existing group chat instead.

---

## 17. Prompt to Kick This Off in Claude Code

> "Set up a new Vite + Preact PWA called WorkoutTracker with `vite-plugin-pwa` and `@vitejs/plugin-basic-ssl`, plus a Supabase project scaffold (`supabase init`, local dev). Implement Phase 2 from this architecture plan: SQL migrations for all nine tables in Section 5 (including `feedback`), with Row Level Security enabled and select/insert/update/delete policies scoped to `auth.uid() = user_id` on every table — note `feedback` only gets insert+select policies, no update/delete for users. Confirm `supabase start` runs locally and `npm run dev` serves over HTTPS on the LAN."

Then Phases 3–13 in separate sessions. Standing rules: every new table gets RLS in the same migration, every new Edge Function starts with the auth check, and every deploy gets a live-URL smoke test afterward (Section 15) — there's no pre-merge preview URL to gate on instead.
