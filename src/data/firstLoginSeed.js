import { listSplitDays, createSplitDay } from './splitDays.js'
import { createExercise } from './exercises.js'
import { CLASSIC_PPL_4DAY } from './planLibrary.js'

// Runs client-side on first login rather than at deploy time, so it's
// scoped to whichever user triggers it and never touches deploy/migration
// state — see Section 5 of the architecture plan.
export async function seedFirstLogin(userId) {
  const existing = await listSplitDays()
  if (existing.length > 0) return

  const days = CLASSIC_PPL_4DAY.days
  for (let i = 0; i < days.length; i++) {
    const { name, exercises } = days[i]
    const splitDay = await createSplitDay({ userId, name, sortOrder: i })

    await Promise.all(
      exercises.map((exercise, j) =>
        createExercise({
          userId,
          splitDayId: splitDay.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          defaultSets: exercise.defaultSets,
          defaultRepRange: exercise.defaultRepRange,
          isCardio: exercise.isCardio ?? false,
          sortOrder: j,
        })
      )
    )
  }
}
