import { useSession, signOut } from './auth/authGuard.js'
import { LoginView } from './auth/LoginView.jsx'
import './app.css'

export function App() {
  const session = useSession()

  if (session === undefined) {
    return <p class="loading">Loading…</p>
  }

  if (!session) {
    return <LoginView />
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
