import { metCaloriesBurned } from './calorieBurnCalculator.js'

// The Health app export is a single daily step total, not a per-minute
// timeline, so this treats the whole count as one continuous walk at a
// typical cadence. That means it can double-count with a logged workout
// that also racked up steps (e.g. treadmill cardio) — a documented
// approximation (Section 11 of the plan), not corrected for, since there's
// no way to know which steps happened during the workout window.
const WALKING_MET = 3.5
const AVERAGE_STEPS_PER_MINUTE = 100

export function stepsToCalories(steps, bodyweightKg) {
  if (!steps || !bodyweightKg) return 0
  const minutes = steps / AVERAGE_STEPS_PER_MINUTE
  return metCaloriesBurned(WALKING_MET, bodyweightKg, minutes / 60)
}
