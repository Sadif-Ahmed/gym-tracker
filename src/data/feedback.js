import { supabase } from '../lib/supabaseClient.js'

export async function submitFeedback({ userId, message, screen = null }) {
  const { data, error } = await supabase
    .from('feedback')
    .insert({ user_id: userId, message, screen })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function listOwnFeedback() {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
