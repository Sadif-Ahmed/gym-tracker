import { signOut } from './authGuard.js'

export function PendingApprovalView({ email }) {
  return (
    <section class="login-view">
      <h1>WorkoutTracker</h1>
      <p role="status">
        {email} is signed in but this account has been disabled. Contact an admin
        to have it re-enabled.
      </p>
      <button type="button" onClick={signOut}>
        Log out
      </button>
    </section>
  )
}
