import { useState } from 'preact/hooks'
import { deleteAllWorkoutSessions } from '../../data/workoutSessions.js'
import { deleteAllFoodEntries } from '../../data/foodEntries.js'
import { deleteAllWeightEntries } from '../../data/weightEntries.js'
import { deleteAllDailySteps } from '../../data/dailySteps.js'
import './settings.css'

// Each entry clears exactly one category of logged history — split
// days/exercises (your setup) and goals/account config are never touched
// here, only past logs. Scoped independently so clearing one doesn't
// force clearing the others.
const DANGER_ACTIONS = [
  {
    key: 'workouts',
    label: 'Clear workout history',
    description: 'Deletes every logged workout session and its sets. Split days and exercises stay.',
    confirmText: 'Delete all workout history? This removes every logged session and set — it cannot be undone.',
    run: deleteAllWorkoutSessions,
  },
  {
    key: 'nutrition',
    label: 'Clear nutrition log',
    description: 'Deletes every logged food entry.',
    confirmText: 'Delete your entire nutrition log? This cannot be undone.',
    run: deleteAllFoodEntries,
  },
  {
    key: 'weight',
    label: 'Clear weight log',
    description: 'Deletes every logged weight entry.',
    confirmText: 'Delete your entire weight log? This cannot be undone.',
    run: deleteAllWeightEntries,
  },
  {
    key: 'steps',
    label: 'Clear steps history',
    description: 'Deletes every logged daily step count.',
    confirmText: 'Delete your entire steps history? This cannot be undone.',
    run: deleteAllDailySteps,
  },
]

export function SettingsView({ userId }) {
  const [error, setError] = useState(null)
  const [busyAction, setBusyAction] = useState(null)
  const [clearedAction, setClearedAction] = useState(null)

  async function handleClear(action) {
    if (!window.confirm(action.confirmText)) return

    setBusyAction(action.key)
    setClearedAction(null)
    setError(null)
    try {
      await action.run(userId)
      setClearedAction(action.key)
      setTimeout(() => setClearedAction((current) => (current === action.key ? null : current)), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <section class="settings-view">
      {error && (
        <p class="settings-error" role="alert">
          {error}
        </p>
      )}

      <h1>Settings</h1>

      <section class="settings-card danger-zone">
        <h2>Danger zone</h2>
        <p class="settings-note">
          Permanently delete your own logged history, by category. This doesn't touch your split
          days, exercises, or goals — only past logs.
        </p>

        <ul class="danger-list">
          {DANGER_ACTIONS.map((action) => (
            <li key={action.key} class="danger-row">
              <div>
                <span class="danger-label">{action.label}</span>
                <span class="danger-description">{action.description}</span>
              </div>
              <button
                type="button"
                class="danger-button"
                onClick={() => handleClear(action)}
                disabled={busyAction === action.key}
              >
                {busyAction === action.key
                  ? 'Clearing…'
                  : clearedAction === action.key
                    ? 'Cleared'
                    : 'Clear'}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}
