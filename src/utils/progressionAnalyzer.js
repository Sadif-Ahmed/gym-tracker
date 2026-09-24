import { toISODate } from './dates.js'

// Epley formula — smooths over rep variation so a 5x5 day and an 8x3 day on
// the same exercise are comparable on one trend line, not just raw weight.
export function estimatedOneRepMax(weightKg, reps) {
  if (!weightKg || !reps) return null
  if (reps === 1) return weightKg
  return weightKg * (1 + reps / 30)
}

// sets: [{ date, weightKg, reps, sessionId }, ...] (unsorted, any order)
// Returns one point per session — the set with the highest estimated 1RM —
// sorted oldest to newest.
export function bestSetPerSession(sets) {
  const bySession = new Map()

  for (const set of sets) {
    if (set.weightKg == null || !set.reps) continue

    const oneRm = estimatedOneRepMax(set.weightKg, set.reps)
    const existing = bySession.get(set.sessionId)
    if (!existing || oneRm > existing.oneRm) {
      bySession.set(set.sessionId, {
        date: set.date,
        weightKg: set.weightKg,
        reps: set.reps,
        oneRm,
        sessionId: set.sessionId,
      })
    }
  }

  return Array.from(bySession.values()).sort((a, b) => a.date.localeCompare(b.date))
}

// sets: [{ date, durationSeconds, sessionId }, ...] (unsorted, any order)
// Returns one point per session — total logged minutes that session, summed
// across every entry (a session may log the same cardio exercise more than
// once) — sorted oldest to newest.
export function totalDurationPerSession(sets) {
  const bySession = new Map()

  for (const set of sets) {
    if (set.durationSeconds == null) continue

    const existing = bySession.get(set.sessionId)
    if (existing) {
      existing.totalMinutes += set.durationSeconds / 60
    } else {
      bySession.set(set.sessionId, {
        date: set.date,
        totalMinutes: set.durationSeconds / 60,
        sessionId: set.sessionId,
      })
    }
  }

  return Array.from(bySession.values()).sort((a, b) => a.date.localeCompare(b.date))
}

// --- Progress tab ---------------------------------------------------------
// sets below are normalized: { exerciseId, sessionId, date, weightKg, reps,
// durationSeconds }. Dates are local YYYY-MM-DD strings; weeks start Monday.

export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00`)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function mondayOf(isoDate) {
  const day = new Date(`${isoDate}T00:00:00`).getDay()
  return addDays(isoDate, -((day + 6) % 7))
}

// One point per session for one exercise, oldest first. `value` is est. 1RM
// (kg) for lifts or total minutes for timed exercises; `isPr` marks a session
// that beat every earlier one (the first session is a baseline, not a PR).
export function exerciseHistory(sets, exercise) {
  const own = sets.filter((set) => set.exerciseId === exercise.id)
  const points = exercise.is_cardio
    ? totalDurationPerSession(own).map((p) => ({ ...p, value: p.totalMinutes }))
    : bestSetPerSession(own)
        .filter((p) => p.oneRm != null) // 0 kg (bodyweight) sets have no 1RM
        .map((p) => ({ ...p, value: p.oneRm }))

  let best = -Infinity
  return points.map((p, i) => {
    const isPr = i > 0 && p.value > best
    best = Math.max(best, p.value)
    return { ...p, isPr }
  })
}

// Best ever, change vs. where it stood 30 days ago (null with no history that
// old), and session count.
export function exerciseStats(points, today) {
  const best = points.reduce((a, b) => (b.value > a.value ? b : a))
  const cutoff = addDays(today, -30)
  const baseline = points.filter((p) => p.date <= cutoff).at(-1)
  return {
    best,
    change30: baseline ? points.at(-1).value - baseline.value : null,
    sessions: points.length,
  }
}

// days: null for all time.
export function pointsSince(points, days, today) {
  if (days == null) return points
  const cutoff = addDays(today, -days)
  return points.filter((p) => p.date >= cutoff)
}

// Totals for the Monday-starting week containing `weekStart`.
export function weekTotals(sets, weekStart) {
  const weekEnd = addDays(weekStart, 6)
  const sessions = new Set()
  let volumeKg = 0
  let minutes = 0
  for (const set of sets) {
    if (set.date < weekStart || set.date > weekEnd) continue
    sessions.add(set.sessionId)
    if (set.weightKg && set.reps) volumeKg += set.weightKg * set.reps
    if (set.durationSeconds) minutes += set.durationSeconds / 60
  }
  return { workouts: sessions.size, volumeKg, minutes }
}

// `weeks` columns of 7 days (Mon..Sun), oldest week first, ending this week.
export function trainingGrid(trainedDates, today, weeks = 12) {
  const firstMonday = addDays(mondayOf(today), -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(firstMonday, w * 7 + d)
      return { date, trained: trainedDates.has(date), future: date > today }
    }),
  )
}

// Consecutive weeks with at least one workout, counting back from this week.
// A week still in progress with no workout yet doesn't break the streak.
export function weekStreak(trainedDates, today) {
  const weekHasWorkout = (monday) =>
    Array.from({ length: 7 }, (_, d) => addDays(monday, d)).some((date) => trainedDates.has(date))

  let monday = mondayOf(today)
  if (!weekHasWorkout(monday)) monday = addDays(monday, -7)
  let streak = 0
  while (weekHasWorkout(monday)) {
    streak++
    monday = addDays(monday, -7)
  }
  return streak
}

// Working sets (warm-ups excluded) per muscle group this week, most first.
export function setsPerMuscle(sets, exercisesById, weekStart) {
  const weekEnd = addDays(weekStart, 6)
  const counts = new Map()
  for (const set of sets) {
    if (set.date < weekStart || set.date > weekEnd) continue
    const exercise = exercisesById.get(set.exerciseId)
    if (!exercise || exercise.no_metrics) continue
    const group = exercise.muscle_group || 'Other'
    counts.set(group, (counts.get(group) ?? 0) + 1)
  }
  return Array.from(counts, ([group, count]) => ({ group, count })).sort((a, b) => b.count - a.count)
}

// Latest PRs across all exercises, newest first.
export function recentRecords(sets, exercises, limit = 5) {
  return exercises
    .filter((exercise) => !exercise.no_metrics)
    .flatMap((exercise) =>
      exerciseHistory(sets, exercise)
        .filter((p) => p.isPr)
        .map((p) => ({ ...p, exercise })),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
}
