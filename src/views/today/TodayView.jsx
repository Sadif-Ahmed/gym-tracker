import { useEffect, useState } from 'preact/hooks'
import { todayISO } from '../../utils/dates.js'
import { listSplitDays } from '../../data/splitDays.js'
import { listExercises } from '../../data/exercises.js'
import {
  getSessionForDate,
  createWorkoutSession,
  updateWorkoutSession,
  listWorkoutSessionsBefore,
} from '../../data/workoutSessions.js'
import { listSetEntries, createSetEntry, deleteSetEntry } from '../../data/setEntries.js'
import { updateExercise } from '../../data/exercises.js'
import { latestWeightEntry } from '../../data/weightEntries.js'
import { classifyExerciseMet } from '../../services/exerciseCalorieBurn.js'
import { computeSessionCalorieBurn } from '../../utils/calorieBurnCalculator.js'
import { groupSetsByExercise, formatSet } from '../../utils/workoutSummary.js'
import './today.css'

const RECENT_HISTORY_LIMIT = 3

const DAY_LABEL = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
})

function formatDayLabel(isoDate) {
  return DAY_LABEL.format(new Date(`${isoDate}T00:00:00`))
}

export function TodayView({ userId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [splitDays, setSplitDays] = useState([])
  const [session, setSession] = useState(null)
  const [exercises, setExercises] = useState([])
  const [setsByExercise, setSetsByExercise] = useState({})
  const [bodyweightKg, setBodyweightKg] = useState(null)
  const [burnEstimate, setBurnEstimate] = useState(null)
  const [burnBreakdown, setBurnBreakdown] = useState(null)
  const [estimatingBurn, setEstimatingBurn] = useState(false)
  const [burnError, setBurnError] = useState(null)
  const [recentSessions, setRecentSessions] = useState([])
  const [changingSplit, setChangingSplit] = useState(false)

  const today = todayISO()

  useEffect(() => {
    loadToday()
  }, [])

  async function loadToday() {
    setLoading(true)
    setError(null)
    try {
      const [existingSession, weight, days, recent] = await Promise.all([
        getSessionForDate(today),
        latestWeightEntry(),
        listSplitDays(),
        listWorkoutSessionsBefore(today, { limit: RECENT_HISTORY_LIMIT }),
      ])
      setBodyweightKg(weight?.weight_kg ?? null)
      setSplitDays(days)
      setRecentSessions(
        await Promise.all(
          recent.map(async (recentSession) => ({
            session: recentSession,
            sets: await listSetEntries(recentSession.id),
          }))
        )
      )
      if (existingSession) {
        await loadSessionData(existingSession)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadSessionData(activeSession) {
    setSession(activeSession)
    const [exerciseList, sets] = await Promise.all([
      listExercises({ splitDayId: activeSession.split_day_id }),
      listSetEntries(activeSession.id),
    ])
    setExercises(exerciseList)

    const grouped = {}
    for (const set of sets) {
      const key = set.exercise_id ?? 'unassigned'
      grouped[key] = grouped[key] ?? []
      grouped[key].push(set)
    }
    setSetsByExercise(grouped)
  }

  async function handleStartWorkout(splitDay) {
    setError(null)
    try {
      const newSession = await createWorkoutSession({
        userId,
        date: today,
        splitDayId: splitDay.id,
        splitDayNameSnapshot: splitDay.name,
        startTime: new Date().toISOString(),
      })
      await loadSessionData(newSession)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleChangeSplit(splitDay) {
    const hasLoggedSets = Object.values(setsByExercise).some((sets) => sets.length > 0)
    if (
      hasLoggedSets &&
      !window.confirm(
        `Switch today's workout to ${splitDay.name}? Sets already logged for exercises outside this split stay saved, but won't show here.`
      )
    ) {
      return
    }

    setError(null)
    try {
      const updated = await updateWorkoutSession(session.id, {
        split_day_id: splitDay.id,
        split_day_name_snapshot: splitDay.name,
      })
      setBurnEstimate(null)
      setBurnBreakdown(null)
      setChangingSplit(false)
      await loadSessionData(updated)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleFinishWorkout() {
    try {
      const updated = await updateWorkoutSession(session.id, {
        end_time: new Date().toISOString(),
      })
      setSession(updated)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleLogSet(exercise, values) {
    setError(null)
    try {
      const existingSets = setsByExercise[exercise.id] ?? []
      const nextSetNumber =
        existingSets.length > 0 ? Math.max(...existingSets.map((s) => s.set_number)) + 1 : 1
      const created = await createSetEntry({
        userId,
        sessionId: session.id,
        exerciseId: exercise.id,
        exerciseNameSnapshot: exercise.name,
        setNumber: nextSetNumber,
        reps: values.reps ?? null,
        weightKg: values.weightKg ?? null,
        durationSeconds: values.durationSeconds ?? null,
      })
      setSetsByExercise((prev) => ({
        ...prev,
        [exercise.id]: [...(prev[exercise.id] ?? []), created],
      }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteSet(exercise, setEntry) {
    setError(null)
    try {
      await deleteSetEntry(setEntry.id)
      setSetsByExercise((prev) => ({
        ...prev,
        [exercise.id]: (prev[exercise.id] ?? []).filter((s) => s.id !== setEntry.id),
      }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleEstimateBurn() {
    setEstimatingBurn(true)
    setBurnError(null)
    try {
      if (!bodyweightKg) {
        throw new Error('Log your weight in Goals before estimating calories burned.')
      }

      const involved = exercises.filter((exercise) => (setsByExercise[exercise.id] ?? []).length > 0)

      // Classify MET is a one-time-per-exercise LLM call, cached on
      // exercises.met_value — most exercises will already have it after
      // their first workout, so this is usually a no-op.
      const involvedWithMet = []
      for (const exercise of involved) {
        if (exercise.met_value != null) {
          involvedWithMet.push(exercise)
          continue
        }
        const metValue = await classifyExerciseMet({
          name: exercise.name,
          muscleGroup: exercise.muscle_group,
          isCardio: exercise.is_cardio,
        })
        const updated = await updateExercise(exercise.id, { met_value: metValue })
        setExercises((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
        involvedWithMet.push(updated)
      }

      const sessionDurationMinutes =
        session.start_time && session.end_time
          ? Math.round((new Date(session.end_time) - new Date(session.start_time)) / 60000)
          : 0

      const { totalCalories, breakdown } = computeSessionCalorieBurn({
        exercises: involvedWithMet,
        setsByExercise,
        bodyweightKg,
        sessionDurationMinutes,
      })

      setBurnEstimate(Math.round(totalCalories))
      setBurnBreakdown(breakdown)
    } catch (err) {
      setBurnError(err.message)
    } finally {
      setEstimatingBurn(false)
    }
  }

  async function handleSaveBurn(value) {
    setBurnError(null)
    try {
      const updated = await updateWorkoutSession(session.id, { estimated_calories_burned: value })
      setSession(updated)
      setBurnEstimate(null)
      setBurnBreakdown(null)
    } catch (err) {
      setBurnError(err.message)
    }
  }

  if (loading) {
    return <p class="loading">Loading today…</p>
  }

  return (
    <section class="today-view">
      {error && (
        <p class="today-error" role="alert">
          {error}
        </p>
      )}

      {!session ? (
        <SplitDayPicker splitDays={splitDays} date={today} onPick={handleStartWorkout} />
      ) : changingSplit ? (
        <div class="change-split-panel">
          <SplitDayPicker splitDays={splitDays} date={today} onPick={handleChangeSplit} />
          <button type="button" class="cancel-change-split" onClick={() => setChangingSplit(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <WorkoutLog
          session={session}
          exercises={exercises}
          setsByExercise={setsByExercise}
          onLogSet={handleLogSet}
          onDeleteSet={handleDeleteSet}
          onFinish={handleFinishWorkout}
          onChangeSplit={() => setChangingSplit(true)}
          burnEstimate={burnEstimate}
          burnBreakdown={burnBreakdown}
          estimatingBurn={estimatingBurn}
          burnError={burnError}
          onEstimateBurn={handleEstimateBurn}
          onSaveBurn={handleSaveBurn}
          onDiscardBurn={() => {
            setBurnEstimate(null)
            setBurnBreakdown(null)
          }}
        />
      )}

      <RecentWorkouts recentSessions={recentSessions} />
    </section>
  )
}

function RecentWorkouts({ recentSessions }) {
  if (recentSessions.length === 0) return null

  return (
    <section class="recent-workouts">
      <p class="eyebrow">
        Last {recentSessions.length} workout{recentSessions.length === 1 ? '' : 's'}
      </p>
      <ul class="recent-workouts-list">
        {recentSessions.map(({ session: recentSession, sets }) => (
          <li key={recentSession.id} class="recent-workout-row">
            <div class="recent-workout-header">
              <span class="recent-workout-date">{formatDayLabel(recentSession.date)}</span>
              <span class="recent-workout-name">{recentSession.split_day_name_snapshot}</span>
            </div>
            {sets.length === 0 ? (
              <p class="empty-state">No sets logged.</p>
            ) : (
              groupSetsByExercise(sets).map((group) => (
                <div class="recent-workout-exercise" key={group.name}>
                  <span class="recent-workout-exercise-name">{group.name}</span>
                  <span class="recent-workout-exercise-sets num">
                    {group.sets.map(formatSet).join(', ')}
                  </span>
                </div>
              ))
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function SplitDayPicker({ splitDays, date, onPick }) {
  return (
    <div class="split-picker">
      <p class="eyebrow">{formatDayLabel(date)}</p>
      <h1>What are you training today?</h1>
      {splitDays.length === 0 ? (
        <p class="empty-state">No split days yet — add one in Manage Split Days.</p>
      ) : (
        <div class="split-picker-grid">
          {splitDays.map((day) => (
            <button
              key={day.id}
              type="button"
              class="split-picker-tile"
              onClick={() => onPick(day)}
            >
              {day.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function WorkoutLog({
  session,
  exercises,
  setsByExercise,
  onLogSet,
  onDeleteSet,
  onFinish,
  onChangeSplit,
  burnEstimate,
  burnBreakdown,
  estimatingBurn,
  burnError,
  onEstimateBurn,
  onSaveBurn,
  onDiscardBurn,
}) {
  return (
    <div class="workout-log">
      <header class="workout-log-header">
        <div>
          <p class="eyebrow">{formatDayLabel(session.date)}</p>
          <h1>{session.split_day_name_snapshot}</h1>
          <button type="button" class="change-split-button" onClick={onChangeSplit}>
            Change split
          </button>
        </div>
        {!session.end_time && (
          <button type="button" class="finish-button" onClick={onFinish}>
            Finish
          </button>
        )}
      </header>

      {session.end_time && <p class="finished-note">Finished — logged and in the books.</p>}

      {exercises.length === 0 ? (
        <p class="empty-state">No exercises assigned to this split day yet.</p>
      ) : (
        exercises.map((exercise) => (
          <ExerciseLedger
            key={exercise.id}
            exercise={exercise}
            sets={setsByExercise[exercise.id] ?? []}
            onLogSet={(values) => onLogSet(exercise, values)}
            onDeleteSet={(setEntry) => onDeleteSet(exercise, setEntry)}
          />
        ))
      )}

      {session.end_time && (
        <BurnEstimateSection
          session={session}
          burnEstimate={burnEstimate}
          burnBreakdown={burnBreakdown}
          estimating={estimatingBurn}
          error={burnError}
          onEstimate={onEstimateBurn}
          onSave={onSaveBurn}
          onDiscard={onDiscardBurn}
        />
      )}
    </div>
  )
}

function BurnEstimateSection({
  session,
  burnEstimate,
  burnBreakdown,
  estimating,
  error,
  onEstimate,
  onSave,
  onDiscard,
}) {
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    if (burnEstimate != null) setEditValue(String(burnEstimate))
  }, [burnEstimate])

  return (
    <section class="burn-estimate-section">
      {error && (
        <p class="today-error" role="alert">
          {error}
        </p>
      )}

      {burnEstimate != null ? (
        <>
          <p class="eyebrow">Estimated calories burned — review before saving</p>
          {burnBreakdown && burnBreakdown.length > 0 && (
            <ul class="burn-breakdown">
              {burnBreakdown.map((entry) => (
                <li key={entry.exerciseId}>
                  <span>{entry.name}</span>
                  <span class="num">{Math.round(entry.calories)} kcal</span>
                </li>
              ))}
            </ul>
          )}
          <div class="burn-review-row">
            <input
              type="number"
              value={editValue}
              onInput={(event) => setEditValue(event.currentTarget.value)}
            />
            <button type="button" onClick={() => onSave(Number(editValue))}>
              Save
            </button>
            <button type="button" onClick={onDiscard}>
              Discard
            </button>
          </div>
        </>
      ) : session.estimated_calories_burned != null ? (
        <div class="burn-saved-row">
          <div>
            <span class="eyebrow">Estimated calories burned</span>
            <span class="num burn-value">{session.estimated_calories_burned}</span>
          </div>
          <button type="button" onClick={onEstimate} disabled={estimating}>
            {estimating ? 'Estimating…' : 'Re-estimate'}
          </button>
        </div>
      ) : (
        <button type="button" class="estimate-burn-button" onClick={onEstimate} disabled={estimating}>
          {estimating ? 'Estimating…' : 'Estimate calories burned'}
        </button>
      )}
    </section>
  )
}

function ExerciseLedger({ exercise, sets, onLogSet, onDeleteSet }) {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [durationMin, setDurationMin] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    if (exercise.is_cardio) {
      const minutes = Number(durationMin)
      if (!minutes) return
      onLogSet({ durationSeconds: Math.round(minutes * 60) })
      setDurationMin('')
      return
    }

    const repsValue = Number(reps)
    if (!repsValue) return
    onLogSet({ reps: repsValue, weightKg: weight === '' ? null : Number(weight) })
    setReps('')
  }

  return (
    <section class="exercise-ledger">
      <header>
        <h2>{exercise.name}</h2>
        <p class="muscle-group">{exercise.muscle_group}</p>
      </header>

      {sets.length > 0 && (
        <table class="set-table">
          <thead>
            <tr>
              <th>Set</th>
              {exercise.is_cardio ? (
                <th>Time</th>
              ) : (
                <>
                  <th>Weight</th>
                  <th>Reps</th>
                </>
              )}
              <th class="sr-only">Remove</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((set) => (
              <tr key={set.id}>
                <td class="num set-number">{set.set_number}</td>
                {exercise.is_cardio ? (
                  <td class="num">{Math.round(set.duration_seconds / 60)}m</td>
                ) : (
                  <>
                    <td class="num">{set.weight_kg ?? '—'}</td>
                    <td class="num">{set.reps}</td>
                  </>
                )}
                <td>
                  <button
                    type="button"
                    class="remove-set"
                    onClick={() => onDeleteSet(set)}
                    aria-label={`Remove set ${set.set_number}`}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form class="log-set-form" onSubmit={handleSubmit}>
        {exercise.is_cardio ? (
          <input
            type="number"
            inputmode="decimal"
            placeholder="Minutes"
            value={durationMin}
            onInput={(event) => setDurationMin(event.currentTarget.value)}
            min="0"
            step="1"
          />
        ) : (
          <>
            <input
              type="number"
              inputmode="decimal"
              placeholder="kg"
              value={weight}
              onInput={(event) => setWeight(event.currentTarget.value)}
              step="0.5"
            />
            <input
              type="number"
              inputmode="numeric"
              placeholder="reps"
              value={reps}
              onInput={(event) => setReps(event.currentTarget.value)}
              min="0"
              step="1"
            />
          </>
        )}
        <button type="submit">Log set</button>
      </form>
    </section>
  )
}
