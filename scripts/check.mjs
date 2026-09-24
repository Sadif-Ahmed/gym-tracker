// Self-checks for the pure logic (no Supabase). Run: npm run check
import assert from 'node:assert/strict'
import { computeSessionCalorieBurn } from '../src/utils/calorieBurnCalculator.js'
import { EXERCISE_CATALOG, findCatalogExercise, catalogMetFor, tutorialFor } from '../src/data/exerciseCatalog.js'
import { PLAN_LIBRARY } from '../src/data/planLibrary.js'
import { formatDuration } from '../src/utils/workoutSummary.js'
import { moveItem, applyOrder } from '../src/utils/useDragReorder.js'

// Calorie burn: warm-ups get 1 min each, cardio its logged time, lifts split the rest.
{
  const exercises = [
    { id: 'w1', no_metrics: true, is_cardio: false, met_value: 8 },
    { id: 'w2', no_metrics: true, is_cardio: false, met_value: 2 },
    { id: 'c', no_metrics: false, is_cardio: true, met_value: 6 },
    { id: 's1', no_metrics: false, is_cardio: false, met_value: 5 },
    { id: 's2', no_metrics: false, is_cardio: false, met_value: 3.5 },
    { id: 'unused', no_metrics: false, is_cardio: false, met_value: 5 },
  ]
  const setsByExercise = {
    w1: [{}], w2: [{}], c: [{ duration_seconds: 600 }], s1: [{}, {}], s2: [{}],
  }
  const { breakdown, totalCalories } = computeSessionCalorieBurn({
    exercises, setsByExercise, bodyweightKg: 60, sessionDurationMinutes: 62,
  })
  const minutes = Object.fromEntries(breakdown.map((b) => [b.exerciseId, b.minutes]))
  assert.deepEqual(minutes, { w1: 1, w2: 1, c: 10, s1: 25, s2: 25 }) // 62 - 10 - 2 = 50, split over 2 lifts
  const expected = (8 * 1 + 2 * 1 + 6 * 10 + 5 * 25 + 3.5 * 25) * 60 / 60
  assert.ok(Math.abs(totalCalories - expected) < 1e-9)
}

// Session shorter than warm-ups + cardio never gives lifts negative time.
{
  const { breakdown } = computeSessionCalorieBurn({
    exercises: [{ id: 'w', no_metrics: true, met_value: 2 }, { id: 's', met_value: 5 }],
    setsByExercise: { w: [{}], s: [{}] },
    bodyweightKg: 70,
    sessionDurationMinutes: 0,
  })
  assert.equal(breakdown.find((b) => b.exerciseId === 's').minutes, 0)
}

// Catalog: every built-in plan exercise is verified, with a matching kind.
for (const plan of PLAN_LIBRARY) {
  for (const day of plan.days) {
    for (const ex of day.exercises) {
      const entry = findCatalogExercise(ex.name)
      assert.ok(entry, `plan exercise missing from catalog: ${ex.name}`)
      const kind = ex.noMetrics ? 'warmup' : ex.isCardio ? 'timed' : 'reps'
      assert.equal(entry.kind, kind, `kind mismatch for ${ex.name}`)
    }
  }
}

// Catalog matching ignores case/punctuation; MET lookup strips a trailing qualifier.
assert.equal(findCatalogExercise('pushups')?.name, 'Push-Ups')
assert.equal(findCatalogExercise("Farmer's Walk")?.name, 'Farmer’s Walk')
assert.equal(findCatalogExercise('Seated Calf Raise (lighter, higher rep)'), null)
assert.equal(catalogMetFor('Seated Calf Raise (lighter, higher rep)'), 3.5)
assert.equal(catalogMetFor('Lat Pulldown [Wide]'), 3.5)
assert.equal(catalogMetFor('Glute Bridges (15 reps)'), 2.8) // the warm-up, not the weighted lift
assert.equal(catalogMetFor('Glute Bridges [Hip Thrust]'), 5)
assert.equal(catalogMetFor('Something Made Up'), null)

// Every catalog exercise has a tutorial; qualified names fall back to the base one.
for (const entry of EXERCISE_CATALOG) assert.match(tutorialFor(entry.name) ?? '', /^[\w-]{11}$/, `no tutorial for ${entry.name}`)
assert.equal(tutorialFor('Lat Pulldown [Wide]'), tutorialFor('Lat Pulldown'))
assert.equal(tutorialFor('Something Made Up'), null)

// Timed sets show seconds under a minute.
assert.equal(formatDuration(30), '30s')
assert.equal(formatDuration(60), '1m')
assert.equal(formatDuration(90), '1m 30s')
assert.equal(formatDuration(900), '15m')

// Reorder moves one item and keeps the rest in order, without mutating input.
{
  const list = ['a', 'b', 'c', 'd']
  assert.deepEqual(moveItem(list, 3, 0), ['d', 'a', 'b', 'c'])
  assert.deepEqual(moveItem(list, 0, 2), ['b', 'c', 'a', 'd'])
  assert.deepEqual(moveItem(list, 1, 1), list)
  assert.deepEqual(list, ['a', 'b', 'c', 'd'])

  // Saved order wins; new items go after in their own order; stale ids ignored.
  const items = ['a', 'b', 'c', 'd'].map((id) => ({ id }))
  const ids = (xs) => xs.map((x) => x.id)
  assert.deepEqual(ids(applyOrder(items, ['c', 'a', 'gone'])), ['c', 'a', 'b', 'd'])
  assert.deepEqual(ids(applyOrder(items, null)), ['a', 'b', 'c', 'd'])
}

console.log('all checks passed')
