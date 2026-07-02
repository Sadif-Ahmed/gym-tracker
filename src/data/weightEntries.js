import { supabase } from '../lib/supabaseClient.js'

export async function listWeightEntries({ limit = 90 } = {}) {
  const { data, error } = await supabase
    .from('weight_entries')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

export async function latestWeightEntry() {
  const { data, error } = await supabase
    .from('weight_entries')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createWeightEntry({ userId, date, weightKg }) {
  const { data, error } = await supabase
    .from('weight_entries')
    .insert({ user_id: userId, date, weight_kg: weightKg })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateWeightEntry(id, updates) {
  const { data, error } = await supabase
    .from('weight_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteWeightEntry(id) {
  const { error } = await supabase.from('weight_entries').delete().eq('id', id)
  if (error) throw error
}
