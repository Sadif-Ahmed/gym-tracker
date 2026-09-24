import { supabase } from '../lib/supabaseClient.js'
import { catalogMetFor } from './exerciseCatalog.js'

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
  noMetrics = false,
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
      no_metrics: noMetrics,
      sort_order: sortOrder,
      // Catalog exercises get a known MET up front; the rest stay null and
      // get LLM-classified on their first Finish.
      met_value: catalogMetFor(name),
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
