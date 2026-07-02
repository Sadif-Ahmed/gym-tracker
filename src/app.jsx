import { useEffect, useState } from 'preact/hooks'
import { useSession, useApproval, signOut } from './auth/authGuard.js'
import { LoginView } from './auth/LoginView.jsx'
import { PendingApprovalView } from './auth/PendingApprovalView.jsx'
import { seedFirstLogin } from './data/firstLoginSeed.js'
import './app.css'

export function App() {
  const session = useSession()
  const approved = useApproval(session)
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    if (!session || !approved) return

    let cancelled = false
    seedFirstLogin(session.user.id).finally(() => {
      if (!cancelled) setSeeded(true)
    })

    return () => {
      cancelled = true
    }
  }, [session, approved])

  if (session === undefined) {
    return <p class="loading">Loading…</p>
  }

  if (!session) {
    return <LoginView />
  }

  if (approved === undefined) {
    return <p class="loading">Loading…</p>
  }

  if (!approved) {
    return <PendingApprovalView email={session.user.email} />
  }

  if (!seeded) {
    return <p class="loading">Loading…</p>
  }

  return (
    <section id="app-shell">
      <header>
        <h1>WorkoutTracker</h1>
        <button type="button" onClick={signOut}>
          Log out
        </button>
      </header>
      <p>Signed in as {session.user.email}</p>
    </section>
  )
}
