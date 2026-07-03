import { useEffect, useState } from 'preact/hooks'
import { listExercises } from '../../data/exercises.js'
import { listSetEntriesForExercise } from '../../data/setEntries.js'
import { bestSetPerSession, totalDurationPerSession } from '../../utils/progressionAnalyzer.js'
import { ProgressChart } from './ProgressChart.jsx'
import './progress.css'

const SHORT_DATE = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

function formatShortDate(isoDate) {
  return SHORT_DATE.format(new Date(`${isoDate}T00:00:00`))
}

export function ProgressView() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exercises, setExercises] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [points, setPoints] = useState([])
  const [loadingPoints, setLoadingPoints] = useState(false)

  useEffect(() => {
    loadExercises()
  }, [])

  async function loadExercises() {
    setLoading(true)
    setError(null)
    try {
      const list = await listExercises({})
      setExercises(list)
      if (list.length > 0) {
        setSelectedId(list[0].id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedId) return
    loadPoints(selectedId)
  }, [selectedId])

  async function loadPoints(exerciseId) {
    setLoadingPoints(true)
    setError(null)
    try {
      const exercise = exercises.find((e) => e.id === exerciseId)
      const raw = await listSetEntriesForExercise(exerciseId)
      const withDate = raw.filter((set) => set.workout_sessions?.date)

      if (exercise?.is_cardio) {
        const normalized = withDate.map((set) => ({
          date: set.workout_sessions.date,
          durationSeconds: set.duration_seconds,
          sessionId: set.session_id,
        }))
        setPoints(totalDurationPerSession(normalized))
      } else {
        const normalized = withDate.map((set) => ({
          date: set.workout_sessions.date,
          weightKg: set.weight_kg,
          reps: set.reps,
          sessionId: set.session_id,
        }))
        setPoints(bestSetPerSession(normalized))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingPoints(false)
    }
  }

  if (loading) {
    return <p class="loading">Loading progress…</p>
  }

  const selectedExercise = exercises.find((e) => e.id === selectedId)
  const isCardio = selectedExercise?.is_cardio ?? false
  const strengthExercises = exercises.filter((e) => !e.is_cardio)
  const cardioExercises = exercises.filter((e) => e.is_cardio)

  return (
    <section class="progress-view">
      {error && (
        <p class="progress-error" role="alert">
          {error}
        </p>
      )}

      <h1>Progress</h1>

      {exercises.length === 0 ? (
        <p class="empty-state">Log a workout first — progress needs history to chart.</p>
      ) : (
        <>
          <select
            class="exercise-select"
            value={selectedId ?? ''}
            onChange={(event) => setSelectedId(event.currentTarget.value)}
          >
            {strengthExercises.length > 0 && (
              <optgroup label="Strength">
                {strengthExercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </optgroup>
            )}
            {cardioExercises.length > 0 && (
              <optgroup label="Cardio">
                {cardioExercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {loadingPoints ? (
            <p class="loading">Loading…</p>
          ) : points.length === 0 ? (
            <p class="empty-state">No sets logged for this exercise yet.</p>
          ) : (
            <>
              {points.length === 1 && (
                <p class="empty-state">Log this exercise again to start seeing a trend.</p>
              )}
              {isCardio ? (
                <>
                  <ProgressChart
                    label="Total minutes"
                    labels={points.map((p) => formatShortDate(p.date))}
                    data={points.map((p) => Math.round(p.totalMinutes * 10) / 10)}
                  />
                  <table class="progress-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Duration (min)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {points
                        .slice()
                        .reverse()
                        .map((p) => (
                          <tr key={p.sessionId}>
                            <td>{formatShortDate(p.date)}</td>
                            <td class="num">{Math.round(p.totalMinutes * 10) / 10}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <>
                  <ProgressChart
                    label="Estimated 1RM (kg)"
                    labels={points.map((p) => formatShortDate(p.date))}
                    data={points.map((p) => Math.round(p.oneRm * 10) / 10)}
                  />
                  <table class="progress-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Top set</th>
                        <th>Est. 1RM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {points
                        .slice()
                        .reverse()
                        .map((p) => (
                          <tr key={p.sessionId}>
                            <td>{formatShortDate(p.date)}</td>
                            <td class="num">
                              {p.weightKg}×{p.reps}
                            </td>
                            <td class="num">{Math.round(p.oneRm * 10) / 10}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}
