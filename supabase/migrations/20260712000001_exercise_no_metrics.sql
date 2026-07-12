-- Some exercises (warm-up drills, mobility work) have no weight/reps/duration
-- to log at all - just "did I do it". is_cardio already means "log a duration
-- instead of weight/reps"; this is a third, simpler logging mode.
alter table exercises add column no_metrics boolean not null default false;
