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

export function formatSet(set) {
  if (set.duration_seconds != null) {
    return `${Math.round(set.duration_seconds / 60)}m`
  }
  return `${set.weight_kg ?? '—'}×${set.reps}`
}
