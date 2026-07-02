import { supabase } from '../lib/supabaseClient.js'

export async function listSetEntries(sessionId) {
  const { data, error } = await supabase
    .from('set_entries')
    .select('*')
    .eq('session_id', sessionId)
    .order('set_number', { ascending: true })

  if (error) throw error
  return data
}

export async function createSetEntry({
  userId,
  sessionId,
  exerciseId = null,
  exerciseNameSnapshot,
  setNumber,
  reps,
  weightKg = null,
  durationSeconds = null,
}) {
  const { data, error } = await supabase
    .from('set_entries')
    .insert({
      user_id: userId,
      session_id: sessionId,
      exercise_id: exerciseId,
      exercise_name_snapshot: exerciseNameSnapshot,
      set_number: setNumber,
      reps,
      weight_kg: weightKg,
      duration_seconds: durationSeconds,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSetEntry(id, updates) {
  const { data, error } = await supabase
    .from('set_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteSetEntry(id) {
  const { error } = await supabase.from('set_entries').delete().eq('id', id)
  if (error) throw error
}
