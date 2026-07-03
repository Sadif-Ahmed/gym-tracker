import { supabase } from '../lib/supabaseClient.js'

// Classifies one exercise's MET value via the LLM - called once per
// exercise ever, since the result gets cached on exercises.met_value by
// the caller. Per Section 9 of the plan: the LLM's job is purely this
// fuzzy "which intensity category" judgment call, not the calorie math
// itself (see src/utils/calorieBurnCalculator.js for the deterministic part).
export async function classifyExerciseMet({ name, muscleGroup, isCardio }) {
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
    body: JSON.stringify({ action: 'classify_exercise_met', name, muscleGroup, isCardio }),
  })

  const body = await resp.json()
  if (!resp.ok) throw new Error(body.error || 'Classification failed')
  return body.met_value
}
