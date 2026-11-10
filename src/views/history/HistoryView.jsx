import { useEffect, useState } from 'preact/hooks'
import {
  listWorkoutSessionsInRange,
  listWorkoutSessionsWithSets,
  deleteWorkoutSession,
} from '../../data/workoutSessions.js'
import { listSetEntries } from '../../data/setEntries.js'
import { groupSetsByExercise, formatSet } from '../../utils/workoutSummary.js'
import { buildWorkoutMarkdown } from '../../utils/workoutExport.js'
import { toISODate, todayISO } from '../../utils/dates.js'
import './history.css'

const DAY_LABEL = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
})

const MONTH_LABEL = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const EXPORT_RANGES = [
  { label: '1 month', slug: '1-month', months: 1 },
  { label: '6 months', slug: '6-months', months: 6 },
  { label: 'All', slug: 'all', months: null },
]

function formatDayLabel(isoDate) {
  return DAY_LABEL.format(new Date(`${isoDate}T00:00:00`))
}

// Clamps to the target month's last day, so Mar 31 minus 1 month is Feb 28
// rather than rolling over into March.
function monthsBefore(date, months) {
  const lastDay = new Date(date.getFullYear(), date.getMonth() - months + 1, 0).getDate()
  return new Date(date.getFullYear(), date.getMonth() - months, Math.min(date.getDate(), lastDay))
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

      <ExportHistory />
    </section>
  )
}

function ExportHistory() {
  const [range, setRange] = useState(EXPORT_RANGES[0])
  const [busy, setBusy] = useState(null)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)

  async function loadMarkdown() {
    const now = new Date()
    const today = toISODate(now)
    const fromDate = range.months ? toISODate(monthsBefore(now, range.months)) : null
    const sessions = await listWorkoutSessionsWithSets(fromDate)
    return { markdown: buildWorkoutMarkdown(sessions, { fromDate, today }), today }
  }

  async function run(action, fn) {
    setBusy(action)
    setStatus(null)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  function handleDownload() {
    run('download', async () => {
      const { markdown, today } = await loadMarkdown()
      const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `workout-history-${range.slug}-${today}.md`
      link.click()
      URL.revokeObjectURL(url)
    })
  }

  function handleCopy() {
    run('copy', async () => {
      // Safari drops the tap's clipboard permission across an await, so hand
      // it a pending ClipboardItem synchronously and let the fetch fill it.
      if (window.ClipboardItem && navigator.clipboard.write) {
        const blob = loadMarkdown().then(({ markdown }) => new Blob([markdown], { type: 'text/plain' }))
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })])
      } else {
        await navigator.clipboard.writeText((await loadMarkdown()).markdown)
      }
      setStatus('Copied. Paste it into your AI chat.')
    })
  }

  return (
    <div class="history-export">
      <h2>Export History</h2>
      <p class="empty-state">
        Your workouts day by day as Markdown, ready to paste into ChatGPT, Claude or any other AI.
      </p>
      <div class="export-ranges" role="group" aria-label="Export range">
        {EXPORT_RANGES.map((r) => (
          <button
            key={r.slug}
            type="button"
            class={range === r ? 'active' : ''}
            aria-pressed={range === r}
            onClick={() => setRange(r)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div class="export-actions">
        <button type="button" disabled={busy != null} onClick={handleDownload}>
          {busy === 'download' ? 'Preparing…' : 'Download'}
        </button>
        <button type="button" disabled={busy != null} onClick={handleCopy}>
          {busy === 'copy' ? 'Copying…' : 'Copy'}
        </button>
      </div>
      {status && <p class="export-status" role="status">{status}</p>}
      {error && (
        <p class="history-error" role="alert">
          {error}
        </p>
      )}
    </div>
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
