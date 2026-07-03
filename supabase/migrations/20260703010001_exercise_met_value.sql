-- Caches the LLM-classified MET (Metabolic Equivalent of Task) value per
-- exercise, so calorie-burn math only ever needs one LLM call per exercise
-- ever, not once per session. The actual calorie arithmetic
-- (met * bodyweight_kg * hours) is deterministic client-side math -
-- the LLM's job is purely the fuzzy "which intensity category" judgment
-- call, not the number itself. No RLS/grant changes needed - exercises
-- already has owner-scoped RLS from Phase 2.
alter table exercises add column met_value numeric;
