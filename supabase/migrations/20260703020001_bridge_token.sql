-- bridge_token: per-user secret used by the iOS Shortcuts steps bridge
-- (ingest-steps Edge Function) to identify whose step count a POST
-- belongs to, in place of a Supabase JWT the Shortcut has no way to
-- obtain — see Section 11 of the architecture plan.
alter table profiles add column bridge_token uuid not null default gen_random_uuid() unique;

-- Regeneration goes through a security-definer function rather than a
-- profiles update policy — profiles intentionally has no update policy
-- for users (Phase 3), since one covering the whole row would let a user
-- flip their own `approved` flag.
create function public.regenerate_bridge_token()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token uuid;
begin
  update public.profiles
  set bridge_token = gen_random_uuid()
  where user_id = auth.uid()
  returning bridge_token into new_token;
  return new_token;
end;
$$;

grant execute on function public.regenerate_bridge_token() to authenticated;
