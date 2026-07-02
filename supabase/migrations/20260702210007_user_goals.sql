-- user_goals: one row per user, drives BMR/TDEE + deficit calculations
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

alter table user_goals enable row level security;

create policy "own rows select" on user_goals for select using (auth.uid() = user_id);
create policy "own rows insert" on user_goals for insert with check (auth.uid() = user_id);
create policy "own rows update" on user_goals for update using (auth.uid() = user_id);
create policy "own rows delete" on user_goals for delete using (auth.uid() = user_id);
