-- The iOS Shortcuts steps bridge is being dropped in favor of manual
-- step entry (Goals view) — bridge_token and its regeneration RPC have
-- no remaining caller now that ingest-steps is deleted.
drop function if exists public.regenerate_bridge_token();
alter table profiles drop column if exists bridge_token;
