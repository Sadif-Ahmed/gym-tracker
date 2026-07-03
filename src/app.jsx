import { useEffect, useState } from 'preact/hooks'
import { useSession, useApproval, usePasswordRecovery, signOut } from './auth/authGuard.js'
import { LoginView } from './auth/LoginView.jsx'
import { PendingApprovalView } from './auth/PendingApprovalView.jsx'
import { ResetPasswordView } from './auth/ResetPasswordView.jsx'
import { seedFirstLogin } from './data/firstLoginSeed.js'
import { TodayView } from './views/today/TodayView.jsx'
import { ManageSplitDaysView } from './views/manageSplitDays/ManageSplitDaysView.jsx'
import { HistoryView } from './views/history/HistoryView.jsx'
import { ProgressView } from './views/progress/ProgressView.jsx'
import { NutritionView } from './views/nutrition/NutritionView.jsx'
import { GoalsView } from './views/goals/GoalsView.jsx'
import { SettingsView } from './views/settings/SettingsView.jsx'
import { HowToView } from './views/howto/HowToView.jsx'
import { useSwUpdate } from './utils/swUpdateListener.js'
import './app.css'

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'history', label: 'History' },
  { id: 'progress', label: 'Progress' },
  { id: 'goals', label: 'Goals' },
  { id: 'splits', label: 'Split Days' },
  { id: 'settings', label: 'Settings' },
  { id: 'howto', label: 'How To Use' },
]

export function App() {
  const session = useSession()
  const approved = useApproval(session)
  const [inRecovery, setInRecovery] = usePasswordRecovery()
  const [seeded, setSeeded] = useState(false)
  const [activeTab, setActiveTab] = useState('today')
  const { needRefresh, updateNow } = useSwUpdate()

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

  let content
  if (session === undefined) {
    content = <p class="loading">Loading…</p>
  } else if (inRecovery) {
    content = <ResetPasswordView onDone={() => setInRecovery(false)} />
  } else if (!session) {
    content = <LoginView />
  } else if (approved === undefined) {
    content = <p class="loading">Loading…</p>
  } else if (!approved) {
    content = <PendingApprovalView email={session.user.email} />
  } else if (!seeded) {
    content = <p class="loading">Loading…</p>
  } else {
    content = (
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
          {activeTab === 'nutrition' && <NutritionView userId={session.user.id} />}
          {activeTab === 'history' && <HistoryView />}
          {activeTab === 'progress' && <ProgressView />}
          {activeTab === 'goals' && <GoalsView userId={session.user.id} />}
          {activeTab === 'splits' && <ManageSplitDaysView userId={session.user.id} />}
          {activeTab === 'settings' && <SettingsView userId={session.user.id} />}
          {activeTab === 'howto' && <HowToView />}
        </main>
      </section>
    )
  }

  return (
    <>
      {needRefresh && (
        <div class="update-toast" role="status">
          <span>New version available</span>
          <button type="button" onClick={updateNow}>
            Refresh
          </button>
        </div>
      )}
      {content}
    </>
  )
}
