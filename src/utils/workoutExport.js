import { groupSetsByExercise, formatDuration } from './workoutSummary.js'

const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'long' })

// Spelled out rather than formatSet's "—×12": an LLM reading the file has
// no UI to tell it a dash means bodyweight.
function formatExportSet(set) {
  if (set.duration_seconds != null) return formatDuration(set.duration_seconds)
  if (set.reps == null) return 'done'
  return set.weight_kg != null ? `${set.weight_kg}kg×${set.reps}` : `bodyweight×${set.reps}`
}

// `sessions` are workout_sessions rows with embedded set_entries (each with
// exercises.muscle_group), oldest first. `fromDate` null means all history.
export function buildWorkoutMarkdown(sessions, { fromDate, today }) {
  const lines = [
    '# Workout history',
    '',
    `Exported ${today}. Range: ${fromDate ?? 'all history'} to ${today}. ${sessions.length} workouts.`,
    'Format: one section per workout day. Sets are `weight×reps` (kg), `bodyweight×reps`, a duration for timed sets, or `done` for warm-ups.',
  ]

  for (const session of sessions) {
    const weekday = WEEKDAY.format(new Date(`${session.date}T00:00:00`))
    lines.push('', `## ${session.date} (${weekday}): ${session.split_day_name_snapshot}`)

    const facts = []
    if (session.start_time && session.end_time) {
      const minutes = Math.round((new Date(session.end_time) - new Date(session.start_time)) / 60000)
      if (minutes > 0) facts.push(`Duration: ${minutes} min`)
    }
    if (session.estimated_calories_burned != null) facts.push(`Est. burn: ${session.estimated_calories_burned} kcal`)
    if (facts.length) lines.push(facts.join(' · '))
    if (session.notes) lines.push(`Notes: ${session.notes}`)
    lines.push('')

    const sets = [...(session.set_entries ?? [])].sort((a, b) => a.set_number - b.set_number)
    if (sets.length === 0) lines.push('- No sets logged')
    for (const group of groupSetsByExercise(sets)) {
      const muscle = group.sets[0].exercises?.muscle_group
      lines.push(`- ${group.name}${muscle ? ` (${muscle})` : ''}: ${group.sets.map(formatExportSet).join(', ')}`)
    }
  }

  return lines.join('\n') + '\n'
}
