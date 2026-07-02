import { useEffect, useState } from 'preact/hooks'
import { getUserGoal, upsertUserGoal } from '../../data/userGoal.js'
import { latestWeightEntry, getWeightEntryForDate, createWeightEntry, updateWeightEntry } from '../../data/weightEntries.js'
import { todayISO } from '../../utils/dates.js'
import { computeDailyTarget } from '../../utils/tdeeCalculator.js'
import './goals.css'

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary — little or no exercise' },
  { value: 'light', label: 'Light — 1-3 days/week' },
  { value: 'moderate', label: 'Moderate — 3-5 days/week' },
  { value: 'active', label: 'Active — 6-7 days/week' },
  { value: 'very_active', label: 'Very active — physical job + training' },
]

const EMPTY_FORM = {
  ageYears: '',
  biologicalSexForBmr: 'male',
  heightCm: '',
  startingWeightKg: '',
  targetWeightKg: '',
  weeklyLossRateKg: '0.5',
  activityLevel: 'sedentary',
}

export function GoalsView({ userId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [goal, setGoal] = useState(null)
  const [latestWeight, setLatestWeight] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [loggingWeight, setLoggingWeight] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [existingGoal, weight] = await Promise.all([getUserGoal(), latestWeightEntry()])
      setLatestWeight(weight)
      if (existingGoal) {
        setGoal(existingGoal)
        setForm({
          ageYears: String(existingGoal.age_years),
          biologicalSexForBmr: existingGoal.biological_sex_for_bmr,
          heightCm: String(existingGoal.height_cm),
          startingWeightKg: String(existingGoal.starting_weight_kg),
          targetWeightKg: String(existingGoal.target_weight_kg),
          weeklyLossRateKg: String(existingGoal.weekly_loss_rate_kg),
          activityLevel: existingGoal.activity_level,
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const saved = await upsertUserGoal({
        userId,
        ageYears: Number(form.ageYears),
        biologicalSexForBmr: form.biologicalSexForBmr,
        heightCm: Number(form.heightCm),
        startingWeightKg: Number(form.startingWeightKg),
        targetWeightKg: Number(form.targetWeightKg),
        weeklyLossRateKg: Number(form.weeklyLossRateKg),
        activityLevel: form.activityLevel,
      })
      setGoal(saved)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleLogWeight(event) {
    event.preventDefault()
    const weightKg = Number(weightInput)
    if (!weightKg) return

    setLoggingWeight(true)
    setError(null)
    try {
      const today = todayISO()
      const existingToday = await getWeightEntryForDate(today)
      const entry = existingToday
        ? await updateWeightEntry(existingToday.id, { weight_kg: weightKg })
        : await createWeightEntry({ userId, date: today, weightKg })
      setLatestWeight(entry)
      setWeightInput('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoggingWeight(false)
    }
  }

  if (loading) {
    return <p class="loading">Loading goals…</p>
  }

  const currentWeight = latestWeight?.weight_kg ?? goal?.starting_weight_kg ?? null
  const dailyTarget = computeDailyTarget(goal, currentWeight)

  return (
    <section class="goals-view">
      {error && (
        <p class="goals-error" role="alert">
          {error}
        </p>
      )}

      <h1>Goals</h1>

      {dailyTarget && (
        <div class="tdee-summary">
          <div>
            <span class="eyebrow">BMR</span>
            <span class="num">{Math.round(dailyTarget.bmr)}</span>
          </div>
          <div>
            <span class="eyebrow">TDEE</span>
            <span class="num">{Math.round(dailyTarget.tdee)}</span>
          </div>
          <div>
            <span class="eyebrow">Daily target</span>
            <span class="num">{Math.round(dailyTarget.targetCalories)}</span>
          </div>
        </div>
      )}

      <form class="weight-log-form" onSubmit={handleLogWeight}>
        <label for="weight-input">
          Today's weight (kg)
          {latestWeight && (
            <span class="latest-weight">
              {' '}
              — last logged {latestWeight.weight_kg}kg on {latestWeight.date}
            </span>
          )}
        </label>
        <div class="weight-log-row">
          <input
            id="weight-input"
            type="number"
            step="0.1"
            min="0"
            placeholder="kg"
            value={weightInput}
            onInput={(event) => setWeightInput(event.currentTarget.value)}
          />
          <button type="submit" disabled={loggingWeight}>
            Log weight
          </button>
        </div>
      </form>

      <form class="goals-form" onSubmit={handleSave}>
        <label for="age">Age (years)</label>
        <input
          id="age"
          type="number"
          min="0"
          required
          value={form.ageYears}
          onInput={(event) => setForm({ ...form, ageYears: event.currentTarget.value })}
        />

        <label for="sex">Biological sex (for the BMR formula)</label>
        <select
          id="sex"
          value={form.biologicalSexForBmr}
          onChange={(event) => setForm({ ...form, biologicalSexForBmr: event.currentTarget.value })}
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

        <label for="height">Height (cm)</label>
        <input
          id="height"
          type="number"
          min="0"
          required
          value={form.heightCm}
          onInput={(event) => setForm({ ...form, heightCm: event.currentTarget.value })}
        />

        <label for="starting-weight">Starting weight (kg)</label>
        <input
          id="starting-weight"
          type="number"
          step="0.1"
          min="0"
          required
          value={form.startingWeightKg}
          onInput={(event) => setForm({ ...form, startingWeightKg: event.currentTarget.value })}
        />

        <label for="target-weight">Target weight (kg)</label>
        <input
          id="target-weight"
          type="number"
          step="0.1"
          min="0"
          required
          value={form.targetWeightKg}
          onInput={(event) => setForm({ ...form, targetWeightKg: event.currentTarget.value })}
        />

        <label for="loss-rate">Weekly loss rate (kg/week)</label>
        <input
          id="loss-rate"
          type="number"
          step="0.1"
          min="0"
          required
          value={form.weeklyLossRateKg}
          onInput={(event) => setForm({ ...form, weeklyLossRateKg: event.currentTarget.value })}
        />

        <label for="activity">Activity level</label>
        <select
          id="activity"
          value={form.activityLevel}
          onChange={(event) => setForm({ ...form, activityLevel: event.currentTarget.value })}
        >
          {ACTIVITY_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>

        <button type="submit" disabled={saving}>
          {goal ? 'Update goals' : 'Save goals'}
        </button>
      </form>
    </section>
  )
}
