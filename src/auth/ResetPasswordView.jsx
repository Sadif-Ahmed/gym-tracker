import { useState } from 'preact/hooks'
import { supabase } from '../lib/supabaseClient.js'

// Rendered instead of the normal app when a PASSWORD_RECOVERY auth event
// fires (see authGuard.js's usePasswordRecovery) — the recovery session
// Supabase establishes from the emailed link is real, but the user hasn't
// chosen a new password yet, so the rest of the app must stay gated.
export function ResetPasswordView({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | done | error
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    if (password !== confirmPassword) {
      setStatus('error')
      setErrorMessage("Passwords don't match.")
      return
    }

    setStatus('submitting')
    setErrorMessage('')

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }

    setStatus('done')
  }

  if (status === 'done') {
    return (
      <section class="login-view">
        <h1>WorkoutTracker</h1>
        <p role="status">Password updated.</p>
        <button type="button" onClick={onDone}>
          Continue
        </button>
      </section>
    )
  }

  return (
    <section class="login-view">
      <h1>WorkoutTracker</h1>
      <p>Choose a new password</p>

      <form onSubmit={handleSubmit}>
        <label for="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          required
          minLength={6}
          value={password}
          onInput={(event) => setPassword(event.currentTarget.value)}
          autocomplete="new-password"
        />

        <label for="confirm-password">Confirm new password</label>
        <input
          id="confirm-password"
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onInput={(event) => setConfirmPassword(event.currentTarget.value)}
          autocomplete="new-password"
        />

        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Updating…' : 'Update password'}
        </button>
        {status === 'error' && <p role="alert">{errorMessage}</p>}
      </form>
    </section>
  )
}
