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

export async function listSetEntriesForSessions(sessionIds) {
  if (sessionIds.length === 0) return []
  const { data, error } = await supabase
    .from('set_entries')
    .select('*')
    .in('session_id', sessionIds)
    .order('set_number', { ascending: true })

  if (error) throw error
  return data
}

// Every set the user has logged, with its session date - Progress computes
// all its stats from this one list. Paged because the API caps a response
// at 1000 rows.
// ponytail: loads full history each visit; add a date floor if it gets slow.
export async function listAllSetEntriesWithDates() {
  const PAGE = 1000
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('set_entries')
      .select('id, exercise_id, session_id, weight_kg, reps, duration_seconds, workout_sessions(date)')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)

    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE) return rows
  }
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
