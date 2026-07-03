-- Cardio set_entries never have reps; stop forcing a fake 0.
alter table set_entries alter column reps drop not null;

update set_entries
set reps = null
where duration_seconds is not null and reps = 0;
