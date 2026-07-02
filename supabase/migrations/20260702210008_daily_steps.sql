-- daily_steps: per-user, per-day step count synced from the iOS Shortcuts bridge
create table daily_steps (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  steps int not null,
  synced_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table daily_steps enable row level security;

create policy "own rows select" on daily_steps for select using (auth.uid() = user_id);
create policy "own rows insert" on daily_steps for insert with check (auth.uid() = user_id);
create policy "own rows update" on daily_steps for update using (auth.uid() = user_id);
create policy "own rows delete" on daily_steps for delete using (auth.uid() = user_id);
