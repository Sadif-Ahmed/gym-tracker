import { useEffect, useState } from 'preact/hooks'
import { todayISO } from '../../utils/dates.js'
import { listSplitDays } from '../../data/splitDays.js'
import { listExercises } from '../../data/exercises.js'
import {
  getSessionForDate,
  createWorkoutSession,
  updateWorkoutSession,
} from '../../data/workoutSessions.js'
import { listSetEntries, createSetEntry, deleteSetEntry } from '../../data/setEntries.js'
import './today.css'

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

  const today = todayISO()

  useEffect(() => {
    loadToday()
  }, [])

  async function loadToday() {
    setLoading(true)
    setError(null)
    try {
      const existingSession = await getSessionForDate(today)
      if (existingSession) {
        await loadSessionData(existingSession)
      } else {
        setSplitDays(await listSplitDays())
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
        reps: values.reps ?? 0,
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
      ) : (
        <WorkoutLog
          session={session}
          exercises={exercises}
          setsByExercise={setsByExercise}
          onLogSet={handleLogSet}
          onDeleteSet={handleDeleteSet}
          onFinish={handleFinishWorkout}
        />
      )}
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

function WorkoutLog({ session, exercises, setsByExercise, onLogSet, onDeleteSet, onFinish }) {
  return (
    <div class="workout-log">
      <header class="workout-log-header">
        <div>
          <p class="eyebrow">{formatDayLabel(session.date)}</p>
          <h1>{session.split_day_name_snapshot}</h1>
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
    </div>
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
