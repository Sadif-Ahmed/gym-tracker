// Shared by History and Today's "recent workouts" glance so both render a
// session's sets the same way.
export function groupSetsByExercise(sets) {
  const order = []
  const groups = {}
  for (const set of sets) {
    const key = set.exercise_name_snapshot
    if (!groups[key]) {
      groups[key] = []
      order.push(key)
    }
    groups[key].push(set)
  }
  return order.map((name) => ({ name, sets: groups[name] }))
}

// "30s", "1m 30s", "15m" - timed sets can be sub-minute (planks, holds).
export function formatDuration(totalSeconds) {
  const seconds = Math.round(totalSeconds)
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes === 0) return `${rest}s`
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`
}

export function formatSet(set) {
  if (set.duration_seconds != null) {
    return formatDuration(set.duration_seconds)
  }
  return `${set.weight_kg ?? '—'}×${set.reps}`
}

// Split-day target for an exercise: "4 × 6-8", or just the range for cardio
// ("15-20 min") and just the count when no range is set.
export function formatTarget(exercise) {
  const { default_sets: sets, default_rep_range: range } = exercise
  if (sets && range) return `${sets} × ${range}`
  if (range) return range
  return sets ? `${sets} sets` : null
}
