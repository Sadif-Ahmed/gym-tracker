-- weight_entries: body weight log used for TDEE/deficit tracking
create table weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric not null
);

alter table weight_entries enable row level security;

create policy "own rows select" on weight_entries for select using (auth.uid() = user_id);
create policy "own rows insert" on weight_entries for insert with check (auth.uid() = user_id);
create policy "own rows update" on weight_entries for update using (auth.uid() = user_id);
create policy "own rows delete" on weight_entries for delete using (auth.uid() = user_id);
