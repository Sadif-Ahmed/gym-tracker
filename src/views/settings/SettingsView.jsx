import { useEffect, useState } from 'preact/hooks'
import { getMyProfile, regenerateBridgeToken } from '../../data/profile.js'
import { deleteAllWorkoutSessions } from '../../data/workoutSessions.js'
import { deleteAllFoodEntries } from '../../data/foodEntries.js'
import { deleteAllWeightEntries } from '../../data/weightEntries.js'
import { deleteAllDailySteps } from '../../data/dailySteps.js'
import './settings.css'

const INGEST_STEPS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-steps`

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
    description: 'Deletes every synced daily step count.',
    confirmText: 'Delete your entire steps history? This cannot be undone.',
    run: deleteAllDailySteps,
  },
]

export function SettingsView({ userId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profile, setProfile] = useState(null)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(null)
  const [busyAction, setBusyAction] = useState(null)
  const [clearedAction, setClearedAction] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setProfile(await getMyProfile())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerate() {
    const confirmed = window.confirm(
      "Regenerating breaks any Shortcut you've already set up with the old token, until you update it there too. Continue?"
    )
    if (!confirmed) return

    setRegenerating(true)
    setError(null)
    try {
      const newToken = await regenerateBridgeToken()
      setProfile((prev) => (prev ? { ...prev, bridge_token: newToken } : prev))
    } catch (err) {
      setError(err.message)
    } finally {
      setRegenerating(false)
    }
  }

  function handleCopy(value, which) {
    navigator.clipboard?.writeText(value)
    setCopied(which)
    setTimeout(() => setCopied((current) => (current === which ? null : current)), 1500)
  }

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

  if (loading) {
    return <p class="loading">Loading settings…</p>
  }

  return (
    <section class="settings-view">
      {error && (
        <p class="settings-error" role="alert">
          {error}
        </p>
      )}

      <h1>Settings</h1>

      <section class="settings-card">
        <h2>Steps bridge (iOS Shortcuts)</h2>
        <p class="settings-note">
          Sync your iPhone's daily step count into WorkoutTracker automatically via a Shortcut you
          set up once, on your own phone. Your token identifies you to the sync endpoint — don't
          share it.
        </p>

        <label class="settings-field">
          <span class="eyebrow">Endpoint URL</span>
          <div class="settings-copy-row">
            <input
              type="text"
              readonly
              value={INGEST_STEPS_URL}
              onFocus={(event) => event.currentTarget.select()}
            />
            <button type="button" onClick={() => handleCopy(INGEST_STEPS_URL, 'url')}>
              {copied === 'url' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </label>

        <label class="settings-field">
          <span class="eyebrow">Your bridge token</span>
          <div class="settings-copy-row">
            <input
              type="text"
              readonly
              value={profile?.bridge_token ?? ''}
              onFocus={(event) => event.currentTarget.select()}
            />
            <button type="button" onClick={() => handleCopy(profile?.bridge_token ?? '', 'token')}>
              {copied === 'token' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </label>

        <button
          type="button"
          class="settings-regenerate"
          onClick={handleRegenerate}
          disabled={regenerating}
        >
          {regenerating ? 'Regenerating…' : 'Regenerate token'}
        </button>

        <ol class="settings-howto">
          <li>
            Open the <strong>Shortcuts</strong> app on your iPhone and create a new Shortcut.
          </li>
          <li>
            Add <strong>Find Health Samples where Type is Steps</strong>, with the date range set to{' '}
            <strong>Today</strong>.
          </li>
          <li>
            Add <strong>Get numbers from health samples</strong>, then sum them to get one total
            step count for today.
          </li>
          <li>
            Add <strong>Get Contents of URL</strong>: method <strong>POST</strong>, URL is the
            endpoint above, header <strong>Authorization: Bearer &lt;your token&gt;</strong>, and a
            JSON body of <code>{'{ "steps": <total> }'}</code>.
          </li>
          <li>
            Turn it into a Personal Automation (Automation tab → Time of Day) so it syncs on its
            own. For roughly hourly updates, Shortcuts has no single "every hour" repeat on one
            automation — add one Time of Day automation per hour you want covered (e.g. 8 AM, 9
            AM, … 10 PM), all running this same Shortcut, and turn off "Ask Before Running" on
            each so they fire silently.
          </li>
        </ol>
      </section>

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
