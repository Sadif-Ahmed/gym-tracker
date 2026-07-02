-- set_entries: individual sets logged within a workout session
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

alter table set_entries enable row level security;

create policy "own rows select" on set_entries for select using (auth.uid() = user_id);
create policy "own rows insert" on set_entries for insert with check (auth.uid() = user_id);
create policy "own rows update" on set_entries for update using (auth.uid() = user_id);
create policy "own rows delete" on set_entries for delete using (auth.uid() = user_id);
