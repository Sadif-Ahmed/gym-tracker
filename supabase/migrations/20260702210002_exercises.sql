-- exercises: exercise library per user, optionally assigned to a split day
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

alter table exercises enable row level security;

create policy "own rows select" on exercises for select using (auth.uid() = user_id);
create policy "own rows insert" on exercises for insert with check (auth.uid() = user_id);
create policy "own rows update" on exercises for update using (auth.uid() = user_id);
create policy "own rows delete" on exercises for delete using (auth.uid() = user_id);
