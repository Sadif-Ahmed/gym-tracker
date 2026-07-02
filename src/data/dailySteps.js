import { supabase } from '../lib/supabaseClient.js'

export async function getDailySteps(date) {
  const { data, error } = await supabase
    .from('daily_steps')
    .select('*')
    .eq('date', date)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertDailySteps({ userId, date, steps }) {
  const { data, error } = await supabase
    .from('daily_steps')
    .upsert({ user_id: userId, date, steps, synced_at: new Date().toISOString() })
    .select()
    .single()

  if (error) throw error
  return data
}
