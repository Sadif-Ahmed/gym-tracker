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
