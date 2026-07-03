import { useEffect, useState } from 'preact/hooks'
import { listWorkoutSessions, deleteWorkoutSession } from '../../data/workoutSessions.js'
import { listSetEntries } from '../../data/setEntries.js'
import { groupSetsByExercise, formatSet } from '../../utils/workoutSummary.js'
import './history.css'

const DAY_LABEL = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
})

function formatDayLabel(isoDate) {
  return DAY_LABEL.format(new Date(`${isoDate}T00:00:00`))
}

export function HistoryView() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sessions, setSessions] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [setsBySession, setSetsBySession] = useState({})
  const [loadingSets, setLoadingSets] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setSessions(await listWorkoutSessions({ limit: 30 }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleExpand(session) {
    if (expandedId === session.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(session.id)

    if (setsBySession[session.id]) return

    setLoadingSets(true)
    setError(null)
    try {
      const sets = await listSetEntries(session.id)
      setSetsBySession((prev) => ({ ...prev, [session.id]: sets }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingSets(false)
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
      if (expandedId === session.id) setExpandedId(null)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <p class="loading">Loading history…</p>
  }

  return (
    <section class="history-view">
      {error && (
        <p class="history-error" role="alert">
          {error}
        </p>
      )}

      <h1>History</h1>

      {sessions.length === 0 ? (
        <p class="empty-state">No workouts logged yet — head to Today to start one.</p>
      ) : (
        <ul class="session-list">
          {sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              expanded={expandedId === session.id}
              sets={setsBySession[session.id]}
              loadingSets={loadingSets && expandedId === session.id}
              onToggle={() => handleExpand(session)}
              onDelete={() => handleDelete(session)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function SessionRow({ session, expanded, sets, loadingSets, onToggle, onDelete }) {
  return (
    <li class="session-row">
      <button type="button" class="session-summary" onClick={onToggle}>
        <div>
          <p class="eyebrow">{formatDayLabel(session.date)}</p>
          <h2>{session.split_day_name_snapshot}</h2>
        </div>
        <span class="session-chevron">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div class="session-detail">
          {session.notes && <p class="session-notes">{session.notes}</p>}

          {loadingSets ? (
            <p class="empty-state">Loading sets…</p>
          ) : !sets || sets.length === 0 ? (
            <p class="empty-state">No sets logged for this session.</p>
          ) : (
            groupSetsByExercise(sets).map((group) => (
              <div class="history-exercise" key={group.name}>
                <span class="history-exercise-name">{group.name}</span>
                <span class="history-exercise-sets num">
                  {group.sets.map(formatSet).join(', ')}
                </span>
              </div>
            ))
          )}

          <button type="button" class="delete-session" onClick={onDelete}>
            Delete workout
          </button>
        </div>
      )}
    </li>
  )
}
