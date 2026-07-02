import { supabase } from '../lib/supabaseClient.js'

export async function listSplitDays() {
  const { data, error } = await supabase
    .from('split_days')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

export async function createSplitDay({ userId, name, sortOrder = 0 }) {
  const { data, error } = await supabase
    .from('split_days')
    .insert({ user_id: userId, name, sort_order: sortOrder })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSplitDay(id, updates) {
  const { data, error } = await supabase
    .from('split_days')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteSplitDay(id) {
  const { error } = await supabase.from('split_days').delete().eq('id', id)
  if (error) throw error
}
