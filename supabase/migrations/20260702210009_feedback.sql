-- feedback: append-only feedback channel, triaged by the app owner via the
-- Supabase dashboard (service role bypasses RLS) — see Section 13 of the plan
create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  screen text,
  created_at timestamptz not null default now(),
  status text not null default 'new'
);

alter table feedback enable row level security;

-- deliberately no update/delete policy for users — feedback is append-only
-- from their side; status is triaged by the owner via the service role
create policy "own feedback insert" on feedback for insert with check (auth.uid() = user_id);
create policy "own feedback select" on feedback for select using (auth.uid() = user_id);
