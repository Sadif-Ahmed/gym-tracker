import { supabase } from '../lib/supabaseClient.js'

// Sends a user-supplied plan document to the LLM proxy and normalizes the
// result into the same shape as src/data/planLibrary.js entries, so it can
// flow through the same preview/apply UI (PlansView.jsx, applyPlanToUser).
export async function parseTrainingPlanMarkdown(markdown) {
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
    body: JSON.stringify({ action: 'parse_training_plan', markdown }),
  })

  const body = await resp.json()
  if (!resp.ok) throw new Error(body.error || 'Plan parsing failed')

  return {
    id: `custom-${crypto.randomUUID()}`,
    name: body.name,
    description: body.description,
    days: body.days.map((day) => ({
      name: day.name,
      exercises: day.exercises.map((exercise) => ({
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        defaultSets: exercise.defaultSets > 0 ? exercise.defaultSets : null,
        defaultRepRange: exercise.defaultRepRange || null,
        isCardio: exercise.isCardio,
      })),
    })),
  }
}
