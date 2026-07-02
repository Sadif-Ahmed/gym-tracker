-- Gate the core data tables on admin approval, not just ownership.
-- Without this, an unapproved user could still hit the API directly with
-- their own valid session and read/write their rows — the "pending
-- approval" screen in the client is only a UI convenience, not a security
-- boundary. feedback is deliberately left ungated so pending users can
-- still ask "why haven't you approved me yet".
create function public.is_approved()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select approved from public.profiles where user_id = auth.uid()), false);
$$;

drop policy "own rows select" on split_days;
drop policy "own rows insert" on split_days;
drop policy "own rows update" on split_days;
drop policy "own rows delete" on split_days;
create policy "own rows select" on split_days for select using (auth.uid() = user_id and public.is_approved());
create policy "own rows insert" on split_days for insert with check (auth.uid() = user_id and public.is_approved());
create policy "own rows update" on split_days for update using (auth.uid() = user_id and public.is_approved());
create policy "own rows delete" on split_days for delete using (auth.uid() = user_id and public.is_approved());

drop policy "own rows select" on exercises;
drop policy "own rows insert" on exercises;
drop policy "own rows update" on exercises;
drop policy "own rows delete" on exercises;
create policy "own rows select" on exercises for select using (auth.uid() = user_id and public.is_approved());
create policy "own rows insert" on exercises for insert with check (auth.uid() = user_id and public.is_approved());
create policy "own rows update" on exercises for update using (auth.uid() = user_id and public.is_approved());
create policy "own rows delete" on exercises for delete using (auth.uid() = user_id and public.is_approved());

drop policy "own rows select" on workout_sessions;
drop policy "own rows insert" on workout_sessions;
drop policy "own rows update" on workout_sessions;
drop policy "own rows delete" on workout_sessions;
create policy "own rows select" on workout_sessions for select using (auth.uid() = user_id and public.is_approved());
create policy "own rows insert" on workout_sessions for insert with check (auth.uid() = user_id and public.is_approved());
create policy "own rows update" on workout_sessions for update using (auth.uid() = user_id and public.is_approved());
create policy "own rows delete" on workout_sessions for delete using (auth.uid() = user_id and public.is_approved());

drop policy "own rows select" on set_entries;
drop policy "own rows insert" on set_entries;
drop policy "own rows update" on set_entries;
drop policy "own rows delete" on set_entries;
create policy "own rows select" on set_entries for select using (auth.uid() = user_id and public.is_approved());
create policy "own rows insert" on set_entries for insert with check (auth.uid() = user_id and public.is_approved());
create policy "own rows update" on set_entries for update using (auth.uid() = user_id and public.is_approved());
create policy "own rows delete" on set_entries for delete using (auth.uid() = user_id and public.is_approved());

drop policy "own rows select" on food_entries;
drop policy "own rows insert" on food_entries;
drop policy "own rows update" on food_entries;
drop policy "own rows delete" on food_entries;
create policy "own rows select" on food_entries for select using (auth.uid() = user_id and public.is_approved());
create policy "own rows insert" on food_entries for insert with check (auth.uid() = user_id and public.is_approved());
create policy "own rows update" on food_entries for update using (auth.uid() = user_id and public.is_approved());
create policy "own rows delete" on food_entries for delete using (auth.uid() = user_id and public.is_approved());

drop policy "own rows select" on weight_entries;
drop policy "own rows insert" on weight_entries;
drop policy "own rows update" on weight_entries;
drop policy "own rows delete" on weight_entries;
create policy "own rows select" on weight_entries for select using (auth.uid() = user_id and public.is_approved());
create policy "own rows insert" on weight_entries for insert with check (auth.uid() = user_id and public.is_approved());
create policy "own rows update" on weight_entries for update using (auth.uid() = user_id and public.is_approved());
create policy "own rows delete" on weight_entries for delete using (auth.uid() = user_id and public.is_approved());

drop policy "own rows select" on user_goals;
drop policy "own rows insert" on user_goals;
drop policy "own rows update" on user_goals;
drop policy "own rows delete" on user_goals;
create policy "own rows select" on user_goals for select using (auth.uid() = user_id and public.is_approved());
create policy "own rows insert" on user_goals for insert with check (auth.uid() = user_id and public.is_approved());
create policy "own rows update" on user_goals for update using (auth.uid() = user_id and public.is_approved());
create policy "own rows delete" on user_goals for delete using (auth.uid() = user_id and public.is_approved());

drop policy "own rows select" on daily_steps;
drop policy "own rows insert" on daily_steps;
drop policy "own rows update" on daily_steps;
drop policy "own rows delete" on daily_steps;
create policy "own rows select" on daily_steps for select using (auth.uid() = user_id and public.is_approved());
create policy "own rows insert" on daily_steps for insert with check (auth.uid() = user_id and public.is_approved());
create policy "own rows update" on daily_steps for update using (auth.uid() = user_id and public.is_approved());
create policy "own rows delete" on daily_steps for delete using (auth.uid() = user_id and public.is_approved());
