import { useSession, useApproval, signOut } from './auth/authGuard.js'
import { LoginView } from './auth/LoginView.jsx'
import { PendingApprovalView } from './auth/PendingApprovalView.jsx'
import './app.css'

export function App() {
  const session = useSession()
  const approved = useApproval(session)

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
