-- Drop the admin-approval gate on signup: new accounts are approved the
-- moment they're created. profiles.approved and the is_approved() RLS
-- checks stay in place as a kill switch - flip a user to false in the
-- dashboard to block them again.
alter table profiles alter column approved set default true;

update profiles set approved = true where approved = false;

-- With signup open, anyone can get a session, so close the one RPC that
-- trusts its caller: increment_llm_usage takes an arbitrary user id and is
-- security definer, so any caller could burn another user's daily LLM cap.
-- Only the llm-proxy Edge Function (service role) should ever call it.
revoke execute on function public.increment_llm_usage(uuid) from public, anon, authenticated;
grant execute on function public.increment_llm_usage(uuid) to service_role;
