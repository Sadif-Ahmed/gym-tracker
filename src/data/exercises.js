import { supabase } from '../lib/supabaseClient.js'

export async function listExercises({ splitDayId } = {}) {
  let query = supabase.from('exercises').select('*').order('sort_order', { ascending: true })

  if (splitDayId) {
    query = query.eq('split_day_id', splitDayId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createExercise({
  userId,
  splitDayId = null,
  name,
  muscleGroup,
  defaultSets = null,
  defaultRepRange = null,
  isCardio = false,
  sortOrder = 0,
}) {
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      user_id: userId,
      split_day_id: splitDayId,
      name,
      muscle_group: muscleGroup,
      default_sets: defaultSets,
      default_rep_range: defaultRepRange,
      is_cardio: isCardio,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateExercise(id, updates) {
  const { data, error } = await supabase
    .from('exercises')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteExercise(id) {
  const { error } = await supabase.from('exercises').delete().eq('id', id)
  if (error) throw error
}
