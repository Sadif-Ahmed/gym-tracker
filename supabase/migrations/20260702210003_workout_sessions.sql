-- workout_sessions: one row per logged workout day
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

alter table workout_sessions enable row level security;

create policy "own rows select" on workout_sessions for select using (auth.uid() = user_id);
create policy "own rows insert" on workout_sessions for insert with check (auth.uid() = user_id);
create policy "own rows update" on workout_sessions for update using (auth.uid() = user_id);
create policy "own rows delete" on workout_sessions for delete using (auth.uid() = user_id);
