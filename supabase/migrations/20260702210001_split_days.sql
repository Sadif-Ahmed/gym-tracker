-- split_days: each user's custom workout split (e.g. Push/Pull/Legs)
create table split_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

alter table split_days enable row level security;

create policy "own rows select" on split_days for select using (auth.uid() = user_id);
create policy "own rows insert" on split_days for insert with check (auth.uid() = user_id);
create policy "own rows update" on split_days for update using (auth.uid() = user_id);
create policy "own rows delete" on split_days for delete using (auth.uid() = user_id);
