-- profiles: one row per auth user, tracks admin approval for the new
-- email+password self-serve signup flow. Approved is flipped to true by
-- the project owner via the Supabase dashboard table editor.
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- users may check their own approval status; nothing else — approval
-- itself is only ever changed by the owner via the dashboard (service role)
create policy "own profile select" on profiles for select using (auth.uid() = user_id);

-- auto-create an (unapproved) profile row whenever someone signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- backfill profiles for any users created before this migration existed
insert into public.profiles (user_id, email)
select id, email from auth.users
on conflict (user_id) do nothing;
