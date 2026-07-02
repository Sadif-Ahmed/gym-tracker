-- food_entries: manual or LLM-photo-estimated calorie/macro logging
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

alter table food_entries enable row level security;

create policy "own rows select" on food_entries for select using (auth.uid() = user_id);
create policy "own rows insert" on food_entries for insert with check (auth.uid() = user_id);
create policy "own rows update" on food_entries for update using (auth.uid() = user_id);
create policy "own rows delete" on food_entries for delete using (auth.uid() = user_id);
