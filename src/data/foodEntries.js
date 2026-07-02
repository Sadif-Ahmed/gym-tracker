import { supabase } from '../lib/supabaseClient.js'

export async function listFoodEntriesForDate(date) {
  const { data, error } = await supabase
    .from('food_entries')
    .select('*')
    .eq('date', date)
    .order('meal_type', { ascending: true })

  if (error) throw error
  return data
}

export async function createFoodEntry({
  userId,
  date,
  mealType,
  name,
  calories,
  proteinG = null,
  carbsG = null,
  fatG = null,
  source = 'manual',
  confirmed = true,
}) {
  const { data, error } = await supabase
    .from('food_entries')
    .insert({
      user_id: userId,
      date,
      meal_type: mealType,
      name,
      calories,
      protein_g: proteinG,
      carbs_g: carbsG,
      fat_g: fatG,
      source,
      confirmed,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateFoodEntry(id, updates) {
  const { data, error } = await supabase
    .from('food_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteFoodEntry(id) {
  const { error } = await supabase.from('food_entries').delete().eq('id', id)
  if (error) throw error
}
