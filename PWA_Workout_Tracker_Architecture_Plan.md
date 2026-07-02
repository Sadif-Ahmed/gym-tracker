# Workout & Calorie Tracker — Multi-User PWA Architecture Plan

**Revision note:** Updated for the actual scope — you plus a handful of gym friends, with the app evolving based on their feedback. This keeps everything from the previous multi-user revision (Supabase auth, Postgres + RLS, per-user isolation) and adds what a small-trusted-group + iterate-on-feedback workflow actually needs: closed signups, a feedback channel, and a safe way to ship changes without disrupting people mid-use.

---

## 1. App Concept (in one line)
A PWA for you and your gym friends — each signs into their own account and gets day-wise workout logging against their own custom split days, calorie tracking (manual + LLM photo estimation), a personal daily deficit target, step data from their own watch via an iOS Shortcuts bridge, JSON export/import, and a way to send you feedback directly from the app.

---

## 2. Recommended Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Build tooling | **Vite** + `vite-plugin-pwa` | Unchanged |
| UI | **Preact** | Unchanged |
| Charts | **Chart.js** | Unchanged |
| Static hosting | **Cloudflare Pages** (free) | Unchanged — and its automatic branch preview URLs are what makes safe iteration possible (Section 15) |
| Auth + database + server functions | **Supabase** (free tier) | Unchanged reasoning: don't hand-roll auth; Postgres + RLS gives per-user isolation enforced by the database itself |
| Local storage | IndexedDB, optional read-only cache | Unchanged — server is the source of truth |
| Backup/portability | JSON export/import | Unchanged |

**Scale check for "me + gym friends":** Supabase free tier (500MB DB, 50K MAU) and Cloudflare Pages free tier aren't just "enough" here, they're wildly oversized for 5-15 people. Nothing in this plan needs to change if the group grows to a few dozen; you'd only revisit the stack if this became a genuinely public product.

---

## 3. Building From Ubuntu — Still Simple

- `npm run dev`, test on iPhone over LAN HTTPS (`@vitejs/plugin-basic-ssl`), deploy via `git push`.
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

**Seeding:** per-user on first login (client-side: if the new user has zero `split_days`, insert the default 3-day template), not at deploy time.

---

## 6. App Architecture (File Structure)

```
workout-tracker/
├── index.html
├── vite.config.js
├── public/icons/
├── supabase/
│   ├── migrations/                  // tables + RLS, including feedback
│   └── functions/
│       ├── llm-proxy/index.ts
│       └── ingest-steps/index.ts
├── src/
│   ├── main.jsx
│   ├── lib/supabaseClient.js
│   ├── auth/
│   │   ├── LoginView.jsx            // no public signup form — see Section 12
│   │   └── authGuard.js
│   ├── data/
│   │   ├── splitDays.js  exercises.js  workoutSessions.js  setEntries.js
│   │   ├── foodEntries.js  weightEntries.js  userGoal.js  dailySteps.js
│   │   ├── feedback.js              // new
│   │   └── firstLoginSeed.js
│   ├── services/
│   │   ├── calorieEstimation.js
│   │   ├── exerciseCalorieBurn.js
│   │   └── backup.js
│   ├── utils/
│   │   ├── tdeeCalculator.js  stepCalorieCalculator.js  progressionAnalyzer.js
│   │   ├── generateId.js  dates.js
│   │   └── swUpdateListener.js      // new — "update available" toast, Section 15
│   └── views/
│       ├── today/ history/ progress/ nutrition/
│       ├── manageSplitDays/ goals/
│       └── settings/                // export/import, account, steps-bridge setup, feedback button
└── package.json
```

---

## 7. Auth Flows & Managing Split Days

Unchanged from the previous revision: Supabase's client handles sessions end to end, `authGuard.js` gates the app, split-day deletion still prompts before touching exercises, snapshots keep history readable through renames/deletes. See Section 12 for the closed-signup change specific to a friends group.

---

## 8. The "Progress Insight" Logic
Unchanged — pure functions over fetched rows, automatically per-user via RLS.

---

## 9. LLM Calls: Photo-to-Calorie & Exercise Burn

Unchanged from the previous revision — auth-checked Edge Function (`llm-proxy`), key stored as a Supabase secret, per-user daily call cap as insurance, photos never persisted, review-before-save stays. Worth keeping the daily cap even for a trusted group — it's not about distrust, it's a cheap guard against a runaway bug (e.g., a retry loop) burning your LLM budget while you're not watching.

---

## 10. Calorie Deficit Tracking
Unchanged — Mifflin-St Jeor BMR + activity multiplier, per-user from their own `user_goals` and latest `weight_entries`.

---

## 11. Steps Bridge (iOS Shortcuts) — Per-User
Unchanged — each friend gets their own `bridge_token`, sets up their own Shortcut on their own phone, staleness label shown, workout-window exclusion remains a documented approximation.

---

## 12. Closed Signups: Just You and Your Friends

Supabase's default is open self-serve signup — fine for a public app, not what you want for a friend group (no reason to expose "sign up" to the open internet for this).

**Recommended approach — manual invite, zero extra code:**
In the Supabase dashboard, **Authentication → Users → Invite User**, enter each friend's email. They get a magic-link email, click it, land signed in. Then separately turn off self-serve signup in **Authentication → Settings** (disable "Allow new users to sign up") so the public URL can't be used to create new accounts outside your invites. This is the whole mechanism — no invite-code system to build or maintain, and it matches how you'll actually operate (you're the one adding people by hand anyway).

If you later want friends to be able to invite *their* friends without going through you, a simple invite-code table is a reasonable v2 — not needed for v1.

---

## 13. The Feedback Loop

A floating "Feedback" button, visible from any screen, opens a small modal with one textarea and a submit button — inserts a row into the `feedback` table (Section 5) tagged with the current screen name. That's the entire UI; resist adding categories, severity levels, or upvoting for a 5-15 person group, it's not worth the complexity yet.

**Triage:** since users can only insert/see their own feedback (no shared visibility by default), you review everything yourself directly in the Supabase dashboard's table editor or SQL editor — your account uses the service role there, which bypasses RLS. Update `status` (`new` → `planned`/`done`/`wontfix`) as you work through it. A shared-visibility policy (so friends can see and upvote each other's requests) is a nice v2 feature once you have a sense of whether people want that.

---

## 14. Export / Import JSON
Unchanged — per-user via RLS, `user_id` stripped/overwritten on import so a file exports cleanly from one account and imports into another, standalone-PWA download quirk still worth testing on-device.

---

## 15. Iterating Safely: Staging, Deploys, and Not Disrupting Your Friends Mid-Set

This is the part that matters most for "build upon it based on feedback" specifically.

### Preview deployments (you already get this for free)
Cloudflare Pages automatically builds a unique preview URL for every branch other than `main`. Workflow: build a feature on a branch → push → get a preview URL → test it yourself on your own phone → merge to `main` only once it's solid → that's what goes live for your friends. This means you're never shipping untested changes straight to people who are relying on the app to log their actual workout.

**Point both the preview and production builds at the same Supabase project** for simplicity (it's still just your data + your friends', low risk) unless you're testing a schema migration you're unsure about — for those, spin up a second free Supabase project temporarily rather than risk a bad migration against real data.

### Don't silently swap versions under an active user
Service workers update in the background by default, which can otherwise cause a confusing mid-session state (half-old, half-new code). Add a small listener:
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
- Vite + Preact + `vite-plugin-pwa` + basic-ssl; Supabase project + local dev; static shell on Cloudflare Pages

**Phase 2 — Schema + RLS migrations**
- All nine tables (Section 5) including `feedback`, RLS + four policies per table in the same migration as its table

**Phase 3 — Auth, closed signup**
- Login view (no signup form), `authGuard.js`, session handling, logout — plus the dashboard-side steps from Section 12 (disable self-serve signup, invite your first test account)

**Phase 4 — First-login seed + data modules**
- `firstLoginSeed.js`, `src/data/*` modules, `generateId()` + local-timezone `todayISO()`

**Phase 5 — Today/logging flow** (MVP moment)

**Phase 6 — Manage split days & exercises**

**Phase 7 — History**

**Phase 8 — Progress charts**

**Phase 9 — Nutrition manual logging + goals + TDEE/deficit**

**Phase 10 — LLM proxy Edge Function + photo-to-calorie + exercise burn**

**Phase 11 — Steps bridge**

**Phase 12 — Export/Import JSON**

**Phase 13 — Feedback loop + safe-iteration setup**
- Feedback button + modal + `data/feedback.js`, `swUpdateListener.js` + toast, confirm Cloudflare preview URLs are working, write the first `CHANGELOG.md` entry

Once Phase 13 is done, invite your friends (Section 12) and you're in steady-state: branch → preview → test → merge → friends get it next time they open the app, feedback flows back into the `feedback` table for you to triage.

---

## 17. Prompt to Kick This Off in Claude Code

> "Set up a new Vite + Preact PWA called WorkoutTracker with `vite-plugin-pwa` and `@vitejs/plugin-basic-ssl`, plus a Supabase project scaffold (`supabase init`, local dev). Implement Phase 2 from this architecture plan: SQL migrations for all nine tables in Section 5 (including `feedback`), with Row Level Security enabled and select/insert/update/delete policies scoped to `auth.uid() = user_id` on every table — note `feedback` only gets insert+select policies, no update/delete for users. Confirm `supabase start` runs locally and `npm run dev` serves over HTTPS on the LAN."

Then Phases 3–13 in separate sessions. Standing rules: every new table gets RLS in the same migration, every new Edge Function starts with the auth check, and nothing merges to `main` without a pass on its Cloudflare preview URL first.
