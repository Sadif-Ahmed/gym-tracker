-- llm_usage: per-user, per-day call counter for the llm-proxy Edge
-- Function. Cheap insurance against a runaway bug (e.g. a client retry
-- loop) burning the LLM budget unattended — see Section 9 of the plan.
-- Only the Edge Function (service role) ever writes this; users may only
-- read their own count.
create table llm_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  call_count int not null default 0,
  unique (user_id, date)
);

alter table llm_usage enable row level security;

create policy "own usage select" on llm_usage for select using (auth.uid() = user_id);

grant select on llm_usage to authenticated;

-- Atomic upsert-increment so concurrent calls from the same user can't
-- race past the daily cap via a read-then-write count.
create function public.increment_llm_usage(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count int;
begin
  insert into llm_usage (user_id, date, call_count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, date)
  do update set call_count = llm_usage.call_count + 1
  returning call_count into new_count;
  return new_count;
end;
$$;
