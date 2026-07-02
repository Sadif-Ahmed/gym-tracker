import { useState } from 'preact/hooks'
import { supabase } from '../lib/supabaseClient.js'

// Self-serve signup (email + password) is intentionally allowed here —
// unlike the original invite-only design, new accounts are gated after
// the fact by admin approval (Section: profiles.approved), not before.
// See PendingApprovalView for what a freshly-signed-up user sees next.
export function LoginView() {
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | signedUp | error
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    const { error } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }

    setStatus(mode === 'signup' ? 'signedUp' : 'idle')
  }

  if (status === 'signedUp') {
    return (
      <section class="login-view">
        <h1>WorkoutTracker</h1>
        <p role="status">
          Account created. Check your email to confirm it, then wait for an admin to
          approve your account before you can sign in.
        </p>
      </section>
    )
  }

  return (
    <section class="login-view">
      <h1>WorkoutTracker</h1>
      <p>{mode === 'signup' ? 'Create an account' : 'Sign in to your account'}</p>

      <form onSubmit={handleSubmit}>
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onInput={(event) => setEmail(event.currentTarget.value)}
          autocomplete="email"
        />

        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onInput={(event) => setPassword(event.currentTarget.value)}
          autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />

        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting'
            ? 'Please wait…'
            : mode === 'signup'
              ? 'Sign up'
              : 'Sign in'}
        </button>
        {status === 'error' && <p role="alert">{errorMessage}</p>}
      </form>

      <button
        type="button"
        class="link-button"
        onClick={() => {
          setMode(mode === 'signup' ? 'signin' : 'signup')
          setStatus('idle')
          setErrorMessage('')
        }}
      >
        {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
      </button>
    </section>
  )
}
