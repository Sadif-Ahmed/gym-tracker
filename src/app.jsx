import { useEffect, useState } from 'preact/hooks'
import { useSession, useApproval, signOut } from './auth/authGuard.js'
import { LoginView } from './auth/LoginView.jsx'
import { PendingApprovalView } from './auth/PendingApprovalView.jsx'
import { seedFirstLogin } from './data/firstLoginSeed.js'
import { TodayView } from './views/today/TodayView.jsx'
import { ManageSplitDaysView } from './views/manageSplitDays/ManageSplitDaysView.jsx'
import './app.css'

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'splits', label: 'Split Days' },
]

export function App() {
  const session = useSession()
  const approved = useApproval(session)
  const [seeded, setSeeded] = useState(false)
  const [activeTab, setActiveTab] = useState('today')

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
        <button type="button" class="logout-button" onClick={signOut}>
          Log out
        </button>
      </header>

      <nav class="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            class={`tab-button${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main>
        {activeTab === 'today' && <TodayView userId={session.user.id} />}
        {activeTab === 'splits' && <ManageSplitDaysView userId={session.user.id} />}
      </main>
    </section>
  )
}
