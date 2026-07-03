import { supabase } from '../lib/supabaseClient.js'

export async function listWorkoutSessions({ limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// Strictly before `date`, so this never double-counts today's own
// in-progress session — used for Today's "recent workouts" glance.
export async function listWorkoutSessionsBefore(date, { limit = 3 } = {}) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .lt('date', date)
    .order('date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

export async function getSessionForDate(date) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('date', date)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getWorkoutSession(id) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createWorkoutSession({
  userId,
  date,
  splitDayId = null,
  splitDayNameSnapshot,
  notes = null,
  startTime = null,
}) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: userId,
      date,
      split_day_id: splitDayId,
      split_day_name_snapshot: splitDayNameSnapshot,
      notes,
      start_time: startTime,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateWorkoutSession(id, updates) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteWorkoutSession(id) {
  const { error } = await supabase.from('workout_sessions').delete().eq('id', id)
  if (error) throw error
}

// set_entries cascade via their own FK on delete, so this alone clears an
// entire workout history — used by the Settings "danger zone".
export async function deleteAllWorkoutSessions(userId) {
  const { error } = await supabase.from('workout_sessions').delete().eq('user_id', userId)
  if (error) throw error
}
