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

// Inclusive on both ends - used by History's month calendar.
export async function listWorkoutSessionsInRange(fromDate, toDate) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: true })

  if (error) throw error
  return data
}

// Sessions with their sets embedded, oldest first - used by History's
// Markdown export. `fromDate` null exports everything. Paged because the
// API caps a response at 1000 rows.
export async function listWorkoutSessionsWithSets(fromDate) {
  const PAGE = 1000
  const rows = []
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from('workout_sessions')
      .select('*, set_entries(*, exercises(muscle_group))')
      .order('date', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (fromDate) query = query.gte('date', fromDate)

    const { data, error } = await query
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE) return rows
  }
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
