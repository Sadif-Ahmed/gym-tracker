import { useEffect, useState } from 'preact/hooks'
import { getMyProfile, regenerateBridgeToken } from '../../data/profile.js'
import './settings.css'

const INGEST_STEPS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-steps`

export function SettingsView() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profile, setProfile] = useState(null)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(null)

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
    </section>
  )
}
