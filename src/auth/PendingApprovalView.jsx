import { signOut } from './authGuard.js'

export function PendingApprovalView({ email }) {
  return (
    <section class="login-view">
      <h1>WorkoutTracker</h1>
      <p role="status">
        {email} is signed in but hasn't been approved yet. An admin needs to approve
        your account before you can use the app.
      </p>
      <button type="button" onClick={signOut}>
        Log out
      </button>
    </section>
  )
}
