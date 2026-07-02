import { supabase } from '../lib/supabaseClient.js'

export async function getUserGoal() {
  const { data, error } = await supabase.from('user_goals').select('*').maybeSingle()

  if (error) throw error
  return data
}

export async function upsertUserGoal({
  userId,
  ageYears,
  biologicalSexForBmr,
  heightCm,
  startingWeightKg,
  targetWeightKg,
  weeklyLossRateKg,
  activityLevel,
}) {
  const { data, error } = await supabase
    .from('user_goals')
    .upsert({
      user_id: userId,
      age_years: ageYears,
      biological_sex_for_bmr: biologicalSexForBmr,
      height_cm: heightCm,
      starting_weight_kg: startingWeightKg,
      target_weight_kg: targetWeightKg,
      weekly_loss_rate_kg: weeklyLossRateKg,
      activity_level: activityLevel,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
