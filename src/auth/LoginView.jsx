import { useState } from 'preact/hooks'
import { supabase } from '../lib/supabaseClient.js'

// Closed signup: this is the only entry point into the app, and it never
// creates new accounts itself — self-serve signup is disabled on the
// Supabase project, so a magic link only works for emails that were
// invited from the dashboard (Section 12 of the architecture plan).
export function LoginView() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus('sending')
    setErrorMessage('')

    const { error } = await supabase.auth.signInWithOtp({ email })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }

    setStatus('sent')
  }

  return (
    <section class="login-view">
      <h1>WorkoutTracker</h1>
      <p>Sign in with the email you were invited with — we'll send you a magic link.</p>

      {status === 'sent' ? (
        <p role="status">Check your email for a sign-in link.</p>
      ) : (
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
          <button type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </button>
          {status === 'error' && <p role="alert">{errorMessage}</p>}
        </form>
      )}
    </section>
  )
}
