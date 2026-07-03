// Standard MET (Metabolic Equivalent of Task) formula - calories burned is
// deterministic given intensity category, bodyweight, and duration. This
// is the same formula most fitness apps use; the only fuzzy judgment call
// is which MET value an exercise falls under, which is what the LLM
// classifies (once per exercise, cached) - see classify_exercise_met.
export function metCaloriesBurned(metValue, bodyweightKg, durationHours) {
  return metValue * bodyweightKg * durationHours
}

// Cardio exercises get their actual logged duration (tracked precisely per
// set). The remaining session time is split evenly across the strength
// exercises performed - session start/end times aren't tracked per
// exercise, so this is the fairest available approximation. Returns a
// per-exercise breakdown too, so the total is never a black box.
export function computeSessionCalorieBurn({
  exercises,
  setsByExercise,
  bodyweightKg,
  sessionDurationMinutes,
}) {
  const involved = exercises.filter((exercise) => (setsByExercise[exercise.id] ?? []).length > 0)
  const cardioExercises = involved.filter((exercise) => exercise.is_cardio)
  const strengthExercises = involved.filter((exercise) => !exercise.is_cardio)

  const cardioMinutesByExercise = new Map()
  let totalCardioMinutes = 0
  for (const exercise of cardioExercises) {
    const sets = setsByExercise[exercise.id] ?? []
    const minutes = sets.reduce((sum, set) => sum + (set.duration_seconds ?? 0), 0) / 60
    cardioMinutesByExercise.set(exercise.id, minutes)
    totalCardioMinutes += minutes
  }

  const remainingMinutes = Math.max(sessionDurationMinutes - totalCardioMinutes, 0)
  const strengthMinutesEach =
    strengthExercises.length > 0 ? remainingMinutes / strengthExercises.length : 0

  const breakdown = involved.map((exercise) => {
    const minutes = exercise.is_cardio ? cardioMinutesByExercise.get(exercise.id) : strengthMinutesEach
    const calories = metCaloriesBurned(exercise.met_value, bodyweightKg, minutes / 60)
    return { exerciseId: exercise.id, name: exercise.name, minutes, metValue: exercise.met_value, calories }
  })

  const totalCalories = breakdown.reduce((sum, entry) => sum + entry.calories, 0)

  return { totalCalories, breakdown }
}
