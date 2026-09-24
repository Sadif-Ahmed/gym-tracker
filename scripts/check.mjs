// Self-checks for the pure logic (no Supabase). Run: npm run check
import assert from 'node:assert/strict'
import { computeSessionCalorieBurn } from '../src/utils/calorieBurnCalculator.js'
import { EXERCISE_CATALOG, findCatalogExercise, catalogMetFor, tutorialFor } from '../src/data/exerciseCatalog.js'
import { PLAN_LIBRARY } from '../src/data/planLibrary.js'
import { formatDuration } from '../src/utils/workoutSummary.js'
import { moveItem, applyOrder } from '../src/utils/useDragReorder.js'
import {
  mondayOf, exerciseHistory, exerciseStats, pointsSince, weekTotals, trainingGrid, weekStreak,
  setsPerMuscle, recentRecords,
} from '../src/utils/progressionAnalyzer.js'

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

// Progress tab: PRs, stats, weekly totals, streak, muscle sets.
{
  assert.equal(mondayOf('2026-09-24'), '2026-09-21') // Thursday
  assert.equal(mondayOf('2026-09-27'), '2026-09-21') // Sunday stays in its week
  assert.equal(mondayOf('2026-09-21'), '2026-09-21')

  const bench = { id: 'b', is_cardio: false, muscle_group: 'Chest' }
  const run = { id: 'r', is_cardio: true, muscle_group: 'Cardio' }
  const warm = { id: 'w', no_metrics: true, muscle_group: 'Other' }
  const set = (exerciseId, sessionId, date, extra) => ({ exerciseId, sessionId, date, ...extra })
  const sets = [
    set('b', 's1', '2026-08-01', { weightKg: 60, reps: 5 }),
    set('b', 's2', '2026-09-15', { weightKg: 55, reps: 5 }),
    set('b', 's3', '2026-09-22', { weightKg: 70, reps: 5 }),
    set('b', 's3', '2026-09-22', { weightKg: 50, reps: 10 }),
    set('r', 's3', '2026-09-22', { durationSeconds: 600 }),
    set('w', 's3', '2026-09-22', {}),
    set('b', 's4', '2026-09-24', { weightKg: 0, reps: 12 }), // bodyweight: no 1RM point
  ]

  const history = exerciseHistory(sets, bench)
  assert.deepEqual(history.map((p) => p.sessionId), ['s1', 's2', 's3'])
  assert.deepEqual(history.map((p) => p.isPr), [false, false, true]) // first is baseline, dip isn't a PR

  const stats = exerciseStats(history, '2026-09-24')
  assert.equal(stats.best.sessionId, 's3')
  assert.equal(stats.change30, 70 * (1 + 5 / 30) - 60 * (1 + 5 / 30)) // vs s1, the last point >= 30 days old
  assert.equal(exerciseStats(history.slice(1), '2026-09-24').change30, null)
  assert.equal(pointsSince(history, 30, '2026-09-24').length, 2)
  assert.equal(pointsSince(history, null, '2026-09-24').length, 3)

  const week = weekTotals(sets, '2026-09-21')
  assert.deepEqual(week, { workouts: 2, volumeKg: 70 * 5 + 50 * 10, minutes: 10 })

  assert.deepEqual(setsPerMuscle(sets, new Map([bench, run, warm].map((e) => [e.id, e])), '2026-09-21'),
    [{ group: 'Chest', count: 3 }, { group: 'Cardio', count: 1 }])

  const trained = new Set(['2026-09-08', '2026-09-15', '2026-09-22'])
  assert.equal(weekStreak(trained, '2026-09-24'), 3)
  assert.equal(weekStreak(new Set(['2026-09-08', '2026-09-15']), '2026-09-24'), 2) // this week not started yet
  assert.equal(weekStreak(new Set(['2026-09-08']), '2026-09-24'), 0)

  const grid = trainingGrid(trained, '2026-09-24')
  assert.equal(grid.length, 12)
  assert.equal(grid.at(-1)[0].date, '2026-09-21')
  assert.equal(grid.at(-1)[1].trained, true)
  assert.equal(grid.at(-1)[6].future, true)

  const records = recentRecords(sets, [bench, run, warm])
  assert.deepEqual(records.map((r) => r.sessionId), ['s3'])
}

console.log('all checks passed')
