import { supabase } from '../lib/supabaseClient.js'

export async function getMyProfile() {
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle()
  if (error) throw error
  return data
}

// Runs as a security-definer function server-side rather than a table
// update, since profiles has no user-facing update policy — see the
// bridge_token migration.
export async function regenerateBridgeToken() {
  const { data, error } = await supabase.rpc('regenerate_bridge_token')
  if (error) throw error
  return data
}
