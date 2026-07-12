import { listSplitDays, createSplitDay } from './splitDays.js'
import { createExercise } from './exercises.js'

// Additive: appends the plan's days after whatever split days the user
// already has, rather than replacing them — deleting/reordering is left to
// the existing Split Days screen.
export async function applyPlanToUser(userId, plan) {
  const existing = await listSplitDays()
  let sortOrder = existing.length

  for (const day of plan.days) {
    const splitDay = await createSplitDay({ userId, name: day.name, sortOrder: sortOrder++ })

    await Promise.all(
      day.exercises.map((exercise, j) =>
        createExercise({
          userId,
          splitDayId: splitDay.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          defaultSets: exercise.defaultSets ?? null,
          defaultRepRange: exercise.defaultRepRange ?? null,
          isCardio: exercise.isCardio ?? false,
          noMetrics: exercise.noMetrics ?? false,
          sortOrder: j,
        })
      )
    )
  }
}
