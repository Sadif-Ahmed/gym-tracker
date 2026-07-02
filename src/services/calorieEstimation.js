import { supabase } from '../lib/supabaseClient.js'

// Sends the photo directly to the Edge Function and discards it locally -
// nothing is uploaded to storage or persisted, per Section 9 of the plan.
// Caller is responsible for review-before-save: this only returns an
// estimate, it never writes to food_entries itself.
export async function estimateFoodFromPhoto(imageBase64) {
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
    body: JSON.stringify({ action: 'estimate_food_photo', imageBase64 }),
  })

  const body = await resp.json()
  if (!resp.ok) throw new Error(body.error || 'Estimation failed')
  return body
}
