-- RLS policies only filter *which* rows a role can touch — Postgres still
-- requires the base table-level privilege before that filtering ever runs.
-- The original Phase 2 migrations enabled RLS and added policies but never
-- granted the underlying privileges, so every request from the
-- `authenticated` role was rejected with "permission denied for table ..."
-- before RLS even got a chance to evaluate. Grants below are scoped to
-- match each table's policies exactly (e.g. feedback stays insert+select
-- only, profiles stays select only).
grant select, insert, update, delete on
  split_days, exercises, workout_sessions, set_entries,
  food_entries, weight_entries, user_goals, daily_steps
to authenticated;

grant select, insert on feedback to authenticated;

grant select on profiles to authenticated;
