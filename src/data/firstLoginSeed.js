import { listSplitDays, createSplitDay } from './splitDays.js'
import { createExercise } from './exercises.js'

const DEFAULT_TEMPLATE = [
  {
    name: 'Push',
    exercises: [
      { name: 'Bench Press', muscleGroup: 'Chest', defaultSets: 4, defaultRepRange: '6-10' },
      { name: 'Overhead Press', muscleGroup: 'Shoulders', defaultSets: 3, defaultRepRange: '8-12' },
      { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', defaultSets: 3, defaultRepRange: '8-12' },
      { name: 'Lateral Raise', muscleGroup: 'Shoulders', defaultSets: 3, defaultRepRange: '12-15' },
      { name: 'Triceps Pushdown', muscleGroup: 'Triceps', defaultSets: 3, defaultRepRange: '10-15' },
    ],
  },
  {
    name: 'Pull',
    exercises: [
      { name: 'Deadlift', muscleGroup: 'Back', defaultSets: 3, defaultRepRange: '5-8' },
      { name: 'Pull-Up', muscleGroup: 'Back', defaultSets: 4, defaultRepRange: '6-10' },
      { name: 'Barbell Row', muscleGroup: 'Back', defaultSets: 3, defaultRepRange: '8-12' },
      { name: 'Face Pull', muscleGroup: 'Shoulders', defaultSets: 3, defaultRepRange: '12-15' },
      { name: 'Barbell Curl', muscleGroup: 'Biceps', defaultSets: 3, defaultRepRange: '10-15' },
    ],
  },
  {
    name: 'Legs',
    exercises: [
      { name: 'Squat', muscleGroup: 'Legs', defaultSets: 4, defaultRepRange: '6-10' },
      { name: 'Romanian Deadlift', muscleGroup: 'Legs', defaultSets: 3, defaultRepRange: '8-12' },
      { name: 'Leg Press', muscleGroup: 'Legs', defaultSets: 3, defaultRepRange: '10-15' },
      { name: 'Leg Curl', muscleGroup: 'Legs', defaultSets: 3, defaultRepRange: '10-15' },
      { name: 'Standing Calf Raise', muscleGroup: 'Calves', defaultSets: 4, defaultRepRange: '12-20' },
    ],
  },
  {
    name: 'Cardio',
    exercises: [
      { name: 'Walk', muscleGroup: 'Cardio', isCardio: true },
      { name: 'Run', muscleGroup: 'Cardio', isCardio: true },
      { name: 'Cycling', muscleGroup: 'Cardio', isCardio: true },
    ],
  },
]

// Runs client-side on first login rather than at deploy time, so it's
// scoped to whichever user triggers it and never touches deploy/migration
// state — see Section 5 of the architecture plan.
export async function seedFirstLogin(userId) {
  const existing = await listSplitDays()
  if (existing.length > 0) return

  for (let i = 0; i < DEFAULT_TEMPLATE.length; i++) {
    const { name, exercises } = DEFAULT_TEMPLATE[i]
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
