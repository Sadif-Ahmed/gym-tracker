import { supabase } from '../lib/supabaseClient.js'

// Sends the photo straight to the Edge Function - nothing is stored.
export async function identifyEquipmentFromPhoto(imageBase64, description) {
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
    body: JSON.stringify({ action: 'identify_equipment', imageBase64, description: description || undefined }),
  })

  const body = await resp.json()
  if (!resp.ok) throw new Error(body.error || 'Identification failed')
  return body
}
