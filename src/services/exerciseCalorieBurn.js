import { supabase } from '../lib/supabaseClient.js'

// Returns an estimate only - caller reviews it before saving to
// workout_sessions.estimated_calories_burned, per Section 9 of the plan.
export async function estimateExerciseBurn({ splitDayName, exerciseSummaries, durationMinutes }) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')

  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/llm-proxy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'estimate_exercise_burn', splitDayName, exerciseSummaries, durationMinutes }),
  })

  const body = await resp.json()
  if (!resp.ok) throw new Error(body.error || 'Estimation failed')
  return body
}
