-- Same class of bug found in Phase 3: GRANTs are required per-role in
-- Postgres regardless of RLS, and service_role is no exception - it
-- bypasses RLS policies, but not table-level privileges. The llm-proxy
-- Edge Function's admin client (service role) had no grant on any table
-- at all, so its own approval check silently failed closed. Grant it
-- full access across the board - it's the trusted server-side role.
grant select, insert, update, delete on
  split_days, exercises, workout_sessions, set_entries,
  food_entries, weight_entries, user_goals, daily_steps,
  feedback, profiles, llm_usage
to service_role;
