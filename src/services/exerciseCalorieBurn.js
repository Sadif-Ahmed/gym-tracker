import { supabase } from '../lib/supabaseClient.js'

// Classifies MET values for a batch of exercises in one LLM call - one call
// per session-finish instead of one per exercise, since the result gets
// cached on exercises.met_value by the caller and each exercise only ever
// needs this once. Per Section 9 of the plan: the LLM's job is purely this
// fuzzy "which intensity category" judgment call, not the calorie math
// itself (see src/utils/calorieBurnCalculator.js for the deterministic part).
export async function classifyExercisesMet(exercises) {
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
    body: JSON.stringify({
      action: 'classify_exercises_met',
      exercises: exercises.map(({ name, muscleGroup, isCardio }) => ({ name, muscleGroup, isCardio })),
    }),
  })

  const body = await resp.json()
  if (!resp.ok) throw new Error(body.error || 'Classification failed')
  return body.exercises
}
