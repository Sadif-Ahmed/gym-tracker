import { useEffect, useMemo, useState } from 'preact/hooks'
import { listExercises } from '../../data/exercises.js'
import { listAllSetEntriesWithDates } from '../../data/setEntries.js'
import { todayISO } from '../../utils/dates.js'
import {
  addDays,
  exerciseHistory,
  exerciseStats,
  mondayOf,
  pointsSince,
  recentRecords,
  setsPerMuscle,
  trainingGrid,
  weekStreak,
  weekTotals,
} from '../../utils/progressionAnalyzer.js'
import { ProgressChart } from './ProgressChart.jsx'
import './progress.css'

const SHORT_DATE = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const RANGES = [
  { label: '1M', days: 30 },
  { label: '3M', days: 91 },
  { label: '1Y', days: 365 },
  { label: 'All', days: null },
]

function formatShortDate(isoDate) {
  return SHORT_DATE.format(new Date(`${isoDate}T00:00:00`))
}

function round1(n) {
  return Math.round(n * 10) / 10
}

function signed(n) {
  return `${n > 0 ? '+' : ''}${round1(n)}`
}

export function ProgressView() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exercises, setExercises] = useState([])
  const [sets, setSets] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [rangeDays, setRangeDays] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [exerciseList, rawSets] = await Promise.all([listExercises({}), listAllSetEntriesWithDates()])
      setExercises(exerciseList)
      setSets(
        rawSets
          .filter((set) => set.workout_sessions?.date)
          .map((set) => ({
            exerciseId: set.exercise_id,
            sessionId: set.session_id,
            date: set.workout_sessions.date,
            weightKg: set.weight_kg,
            reps: set.reps,
            durationSeconds: set.duration_seconds,
          })),
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const today = todayISO()

  const overview = useMemo(() => {
    const thisWeek = mondayOf(today)
    const trainedDates = new Set(sets.map((set) => set.date))
    const exercisesById = new Map(exercises.map((e) => [e.id, e]))
    return {
      current: weekTotals(sets, thisWeek),
      previous: weekTotals(sets, addDays(thisWeek, -7)),
      grid: trainingGrid(trainedDates, today),
      streak: weekStreak(trainedDates, today),
      muscles: setsPerMuscle(sets, exercisesById, thisWeek),
      records: recentRecords(sets, exercises),
    }
  }, [sets, exercises, today])

  // Only exercises with chartable history, most recently trained first.
  const logged = useMemo(() => {
    return exercises
      .filter((e) => !e.no_metrics)
      .map((exercise) => ({ exercise, points: exerciseHistory(sets, exercise) }))
      .filter(({ points }) => points.length > 0)
      .sort((a, b) => b.points.at(-1).date.localeCompare(a.points.at(-1).date))
  }, [sets, exercises])

  const selected = logged.find((l) => l.exercise.id === selectedId) ?? logged[0]

  if (loading) {
    return <p class="loading">Loading progress…</p>
  }

  return (
    <section class="progress-view">
      {error && (
        <p class="progress-error" role="alert">
          {error}
        </p>
      )}

      <h1>Progress</h1>

      {sets.length === 0 ? (
        <p class="empty-state">Log a workout first — progress needs history to chart.</p>
      ) : (
        <>
          <WeekSummary current={overview.current} previous={overview.previous} />
          <Consistency grid={overview.grid} streak={overview.streak} />
          <MuscleSets muscles={overview.muscles} />
          <RecentRecords records={overview.records} />
          {selected && (
            <ExerciseDetail
              logged={logged}
              selected={selected}
              onSelect={setSelectedId}
              rangeDays={rangeDays}
              onRange={setRangeDays}
              today={today}
            />
          )}
        </>
      )}
    </section>
  )
}

function Delta({ now, before, unit = '' }) {
  if (!before) return <span class="stat-sub">last week {before}{unit}</span>
  const pct = Math.round(((now - before) / before) * 100)
  return (
    <span class={`stat-sub ${pct > 0 ? 'up' : pct < 0 ? 'down' : ''}`}>
      {pct > 0 ? '▲' : pct < 0 ? '▼' : '='} {Math.abs(pct)}% vs last week
    </span>
  )
}

function WeekSummary({ current, previous }) {
  return (
    <div class="progress-block">
      <h2>This week</h2>
      <div class="stat-row">
        <div class="stat">
          <span class="stat-value">{current.workouts}</span>
          <span class="stat-label">Workouts</span>
          <Delta now={current.workouts} before={previous.workouts} />
        </div>
        <div class="stat">
          <span class="stat-value">{Math.round(current.volumeKg).toLocaleString()}</span>
          <span class="stat-label">Volume (kg)</span>
          <Delta now={current.volumeKg} before={Math.round(previous.volumeKg)} unit=" kg" />
        </div>
        <div class="stat">
          <span class="stat-value">{Math.round(current.minutes)}</span>
          <span class="stat-label">Timed min</span>
          <Delta now={current.minutes} before={Math.round(previous.minutes)} unit=" min" />
        </div>
      </div>
    </div>
  )
}

function Consistency({ grid, streak }) {
  const trainedCount = grid.flat().filter((d) => d.trained).length
  return (
    <div class="progress-block">
      <div class="block-head">
        <h2>Consistency</h2>
        <span class="streak">
          {streak > 0 ? `${streak}-week streak` : 'No streak yet'}
        </span>
      </div>
      <div
        class="training-grid"
        role="img"
        aria-label={`${trainedCount} training days in the last 12 weeks`}
      >
        {grid.map((week) => (
          <div class="training-week" key={week[0].date}>
            {week.map((day) => (
              <span
                key={day.date}
                class={`training-day${day.trained ? ' trained' : ''}${day.future ? ' future' : ''}`}
                title={formatShortDate(day.date)}
              />
            ))}
          </div>
        ))}
      </div>
      <p class="grid-caption">Last 12 weeks · each column is a week, Mon at top</p>
    </div>
  )
}

function MuscleSets({ muscles }) {
  const max = Math.max(1, ...muscles.map((m) => m.count))
  return (
    <div class="progress-block">
      <h2>Sets per muscle · this week</h2>
      {muscles.length === 0 ? (
        <p class="empty-state">No working sets logged this week yet.</p>
      ) : (
        <ul class="muscle-bars">
          {muscles.map((m) => (
            <li key={m.group}>
              <span class="muscle-name">{m.group}</span>
              <span class="muscle-track">
                <span class="muscle-fill" style={{ width: `${(m.count / max) * 100}%` }} />
              </span>
              <span class="muscle-count">{m.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function recordText(record) {
  return record.exercise.is_cardio
    ? `${round1(record.value)} min`
    : `${record.weightKg}×${record.reps} · est. ${round1(record.value)} kg`
}

function RecentRecords({ records }) {
  if (records.length === 0) return null
  return (
    <div class="progress-block">
      <h2>Recent records</h2>
      <ul class="record-list">
        {records.map((r) => (
          <li key={`${r.exercise.id}-${r.sessionId}`}>
            <span class="pr-badge">PR</span>
            <span class="record-name">{r.exercise.name}</span>
            <span class="record-value">{recordText(r)}</span>
            <span class="record-date">{formatShortDate(r.date)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ExerciseDetail({ logged, selected, onSelect, rangeDays, onRange, today }) {
  const { exercise, points: allPoints } = selected
  const isCardio = exercise.is_cardio
  const unit = isCardio ? 'min' : 'kg'
  const stats = exerciseStats(allPoints, today)
  const points = pointsSince(allPoints, rangeDays, today)
  const strength = logged.filter((l) => !l.exercise.is_cardio)
  const timed = logged.filter((l) => l.exercise.is_cardio)

  return (
    <div class="progress-block">
      <h2>By exercise</h2>
      <select
        class="exercise-select"
        value={exercise.id}
        onChange={(event) => onSelect(event.currentTarget.value)}
      >
        {strength.length > 0 && (
          <optgroup label="Strength">
            {strength.map((l) => (
              <option key={l.exercise.id} value={l.exercise.id}>
                {l.exercise.name}
              </option>
            ))}
          </optgroup>
        )}
        {timed.length > 0 && (
          <optgroup label="Timed">
            {timed.map((l) => (
              <option key={l.exercise.id} value={l.exercise.id}>
                {l.exercise.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      <div class="stat-row">
        <div class="stat">
          <span class="stat-value">
            {round1(stats.best.value)}
            <small> {unit}</small>
          </span>
          <span class="stat-label">{isCardio ? 'Longest' : 'Best est. 1RM'}</span>
          <span class="stat-sub">{formatShortDate(stats.best.date)}</span>
        </div>
        <div class="stat">
          <span
            class={`stat-value ${stats.change30 > 0 ? 'up' : stats.change30 < 0 ? 'down' : ''}`}
          >
            {stats.change30 == null ? '—' : signed(stats.change30)}
            {stats.change30 != null && <small> {unit}</small>}
          </span>
          <span class="stat-label">30-day change</span>
          {stats.change30 == null && <span class="stat-sub">needs a month of history</span>}
        </div>
        <div class="stat">
          <span class="stat-value">{stats.sessions}</span>
          <span class="stat-label">Sessions</span>
        </div>
      </div>

      <div class="range-tabs" role="group" aria-label="Time range">
        {RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            class={rangeDays === r.days ? 'active' : ''}
            aria-pressed={rangeDays === r.days}
            onClick={() => onRange(r.days)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {points.length === 0 ? (
        <p class="empty-state">No sessions in this range.</p>
      ) : (
        <>
          {allPoints.length === 1 && (
            <p class="empty-state">Log this exercise again to start seeing a trend.</p>
          )}
          <ProgressChart
            label={isCardio ? 'Total minutes' : 'Estimated 1RM (kg)'}
            labels={points.map((p) => formatShortDate(p.date))}
            data={points.map((p) => round1(p.value))}
            highlights={points.map((p) => p.isPr)}
          />
          <table class="progress-table">
            <thead>
              <tr>
                <th>Date</th>
                {!isCardio && <th>Top set</th>}
                <th>{isCardio ? 'Duration (min)' : 'Est. 1RM'}</th>
              </tr>
            </thead>
            <tbody>
              {points
                .slice()
                .reverse()
                .map((p) => (
                  <tr key={p.sessionId}>
                    <td>
                      {formatShortDate(p.date)}
                      {p.isPr && <span class="pr-badge">PR</span>}
                    </td>
                    {!isCardio && (
                      <td class="num">
                        {p.weightKg}×{p.reps}
                      </td>
                    )}
                    <td class="num">{round1(p.value)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
