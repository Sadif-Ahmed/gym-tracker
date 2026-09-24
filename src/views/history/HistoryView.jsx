import { useEffect, useState } from 'preact/hooks'
import { listWorkoutSessionsInRange, deleteWorkoutSession } from '../../data/workoutSessions.js'
import { listSetEntries } from '../../data/setEntries.js'
import { groupSetsByExercise, formatSet } from '../../utils/workoutSummary.js'
import { toISODate, todayISO } from '../../utils/dates.js'
import './history.css'

const DAY_LABEL = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
})

const MONTH_LABEL = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function formatDayLabel(isoDate) {
  return DAY_LABEL.format(new Date(`${isoDate}T00:00:00`))
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function HistoryView() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sessions, setSessions] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [setsBySession, setSetsBySession] = useState({})

  useEffect(() => {
    // Guards against a slow earlier month landing after a quicker later one
    // when ‹ › is tapped rapidly.
    let cancelled = false
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0)
    setError(null)
    listWorkoutSessionsInRange(toISODate(month), toISODate(lastDay))
      .then(async (monthSessions) => {
        if (cancelled) return
        setSessions(monthSessions)
        // Open on the latest workout of the month so there's detail to see
        // without an extra tap.
        const latest = monthSessions.at(-1)
        if (latest) await selectDate(latest.date, monthSessions)
        else setSelectedDate(null)
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [month])

  async function selectDate(date, monthSessions = sessions) {
    setSelectedDate(date)
    const toLoad = monthSessions.filter((s) => s.date === date && !setsBySession[s.id])
    if (toLoad.length === 0) return

    setError(null)
    try {
      const loaded = await Promise.all(toLoad.map(async (s) => [s.id, await listSetEntries(s.id)]))
      setSetsBySession((prev) => ({ ...prev, ...Object.fromEntries(loaded) }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(session) {
    if (!window.confirm(`Delete this ${formatDayLabel(session.date)} workout? This can't be undone.`)) {
      return
    }
    setError(null)
    try {
      await deleteWorkoutSession(session.id)
      setSessions((prev) => prev.filter((s) => s.id !== session.id))
    } catch (err) {
      setError(err.message)
    }
  }

  function shiftMonth(delta) {
    // Clear in the same render as the month change so the previous month's
    // workouts never flash under the new month's grid.
    setLoading(true)
    setSessions([])
    setSelectedDate(null)
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  const isCurrentMonth = month.getTime() === startOfMonth(new Date()).getTime()
  const selectedSessions = sessions.filter((s) => s.date === selectedDate)

  return (
    <section class="history-view">
      {error && (
        <p class="history-error" role="alert">
          {error}
        </p>
      )}

      <h1>History</h1>

      <div class="calendar">
        <div class="calendar-nav">
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            ‹
          </button>
          <h2>{MONTH_LABEL.format(month)}</h2>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            disabled={isCurrentMonth}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <CalendarGrid
          month={month}
          workoutDates={new Set(sessions.map((s) => s.date))}
          selectedDate={selectedDate}
          onSelect={(date) => selectDate(date)}
        />
      </div>

      {loading ? (
        <p class="loading">Loading history…</p>
      ) : sessions.length === 0 ? (
        <p class="empty-state">No workouts logged this month.</p>
      ) : selectedSessions.length === 0 ? (
        <p class="empty-state">Tap a highlighted day to see that workout.</p>
      ) : (
        selectedSessions.map((session) => (
          <SessionDetail
            key={session.id}
            session={session}
            sets={setsBySession[session.id]}
            onDelete={() => handleDelete(session)}
          />
        ))
      )}
    </section>
  )
}

function CalendarGrid({ month, workoutDates, selectedDate, onSelect }) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  // Monday-first: getDay() is 0 for Sunday.
  const leadingBlanks = (month.getDay() + 6) % 7
  const today = todayISO()

  const cells = []
  for (let i = 0; i < leadingBlanks; i++) cells.push(<span key={`blank-${i}`} />)
  for (let day = 1; day <= daysInMonth; day++) {
    const date = toISODate(new Date(year, monthIndex, day))
    const hasWorkout = workoutDates.has(date)
    const classes = ['calendar-day']
    if (hasWorkout) classes.push('has-workout')
    if (date === selectedDate) classes.push('selected')
    if (date === today) classes.push('today')
    cells.push(
      <button
        key={date}
        type="button"
        class={classes.join(' ')}
        disabled={!hasWorkout}
        onClick={() => onSelect(date)}
        aria-label={`${formatDayLabel(date)}${hasWorkout ? ', workout logged' : ''}`}
        aria-pressed={date === selectedDate}
      >
        {day}
      </button>
    )
  }

  return (
    <div class="calendar-grid">
      {WEEKDAYS.map((label, i) => (
        <span key={`wd-${i}`} class="calendar-weekday">
          {label}
        </span>
      ))}
      {cells}
    </div>
  )
}

function SessionDetail({ session, sets, onDelete }) {
  return (
    <article class="session-row">
      <div class="session-summary">
        <div>
          <p class="eyebrow">{formatDayLabel(session.date)}</p>
          <h2>{session.split_day_name_snapshot}</h2>
        </div>
        {session.estimated_calories_burned != null && (
          <span class="session-burn num">{session.estimated_calories_burned} kcal</span>
        )}
      </div>

      <div class="session-detail">
        {session.notes && <p class="session-notes">{session.notes}</p>}

        {!sets ? (
          <p class="empty-state">Loading sets…</p>
        ) : sets.length === 0 ? (
          <p class="empty-state">No sets logged for this session.</p>
        ) : (
          groupSetsByExercise(sets).map((group) => (
            <div class="history-exercise" key={group.name}>
              <span class="history-exercise-name">{group.name}</span>
              <span class="history-exercise-sets num">{group.sets.map(formatSet).join(', ')}</span>
            </div>
          ))
        )}

        <button type="button" class="delete-session" onClick={onDelete}>
          Delete workout
        </button>
      </div>
    </article>
  )
}
