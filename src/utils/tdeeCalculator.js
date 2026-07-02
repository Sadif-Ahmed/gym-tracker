const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const KCAL_PER_KG_FAT = 7700

// Mifflin-St Jeor
export function calculateBmr({ weightKg, heightCm, ageYears, biologicalSex }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears
  return biologicalSex === 'female' ? base - 161 : base + 5
}

export function calculateTdee(bmr, activityLevel) {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? ACTIVITY_MULTIPLIERS.sedentary
  return bmr * multiplier
}

export function calculateDailyDeficitTarget(tdee, weeklyLossRateKg) {
  const dailyDeficit = (weeklyLossRateKg * KCAL_PER_KG_FAT) / 7
  return tdee - dailyDeficit
}

// Combines the three steps above using a user's saved goals + their most
// recently logged weight (falling back to starting_weight_kg if they
// haven't logged one yet) — the one entry point views should use.
export function computeDailyTarget(goal, currentWeightKg) {
  if (!goal || !currentWeightKg) return null

  const bmr = calculateBmr({
    weightKg: currentWeightKg,
    heightCm: goal.height_cm,
    ageYears: goal.age_years,
    biologicalSex: goal.biological_sex_for_bmr,
  })
  const tdee = calculateTdee(bmr, goal.activity_level)
  const targetCalories = calculateDailyDeficitTarget(tdee, goal.weekly_loss_rate_kg)

  return { bmr, tdee, targetCalories }
}

export { ACTIVITY_MULTIPLIERS }
