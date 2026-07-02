import { useEffect, useState } from 'preact/hooks'
import { listFoodEntriesForDate, createFoodEntry, deleteFoodEntry } from '../../data/foodEntries.js'
import { getUserGoal } from '../../data/userGoal.js'
import { latestWeightEntry } from '../../data/weightEntries.js'
import { todayISO } from '../../utils/dates.js'
import { computeDailyTarget } from '../../utils/tdeeCalculator.js'
import './nutrition.css'

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

export function NutritionView({ userId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [entries, setEntries] = useState([])
  const [target, setTarget] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const today = todayISO()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [foodEntries, goal, weight] = await Promise.all([
        listFoodEntriesForDate(today),
        getUserGoal(),
        latestWeightEntry(),
      ])
      setEntries(foodEntries)
      const currentWeight = weight?.weight_kg ?? goal?.starting_weight_kg ?? null
      setTarget(computeDailyTarget(goal, currentWeight))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(values) {
    setError(null)
    try {
      const created = await createFoodEntry({ userId, date: today, ...values })
      setEntries((prev) => [...prev, created])
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(entry) {
    setError(null)
    try {
      await deleteFoodEntry(entry.id)
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <p class="loading">Loading nutrition…</p>
  }

  const totalCalories = entries.reduce((sum, entry) => sum + entry.calories, 0)
  const remaining = target ? Math.round(target.targetCalories - totalCalories) : null

  return (
    <section class="nutrition-view">
      {error && (
        <p class="nutrition-error" role="alert">
          {error}
        </p>
      )}

      <h1>Nutrition</h1>

      <div class="calorie-summary">
        <div>
          <span class="eyebrow">Consumed</span>
          <span class="num">{totalCalories}</span>
        </div>
        {target ? (
          <>
            <div>
              <span class="eyebrow">Target</span>
              <span class="num">{Math.round(target.targetCalories)}</span>
            </div>
            <div>
              <span class="eyebrow">Remaining</span>
              <span class={`num${remaining < 0 ? ' over' : ''}`}>{remaining}</span>
            </div>
          </>
        ) : (
          <p class="empty-state">Set up your goals to see a daily target.</p>
        )}
      </div>

      {entries.length === 0 ? (
        <p class="empty-state">No food logged today.</p>
      ) : (
        <ul class="food-list">
          {entries.map((entry) => (
            <li key={entry.id} class="food-row">
              <div class="food-info">
                <span class="food-name">{entry.name}</span>
                <span class="food-meta">{entry.meal_type}</span>
              </div>
              <span class="num">{entry.calories}</span>
              <button
                type="button"
                class="remove-food"
                onClick={() => handleDelete(entry)}
                aria-label={`Remove ${entry.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <AddFoodForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
      ) : (
        <button type="button" class="add-food-button" onClick={() => setShowForm(true)}>
          + Log food
        </button>
      )}
    </section>
  )
}

function AddFoodForm({ onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [mealType, setMealType] = useState(MEAL_TYPES[0])
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    const caloriesValue = Number(calories)
    if (!trimmedName || !caloriesValue) return

    onAdd({
      name: trimmedName,
      mealType,
      calories: caloriesValue,
      proteinG: protein === '' ? null : Number(protein),
      carbsG: carbs === '' ? null : Number(carbs),
      fatG: fat === '' ? null : Number(fat),
    })
  }

  return (
    <form class="add-food-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Food name"
        value={name}
        onInput={(event) => setName(event.currentTarget.value)}
        autofocus
      />
      <select value={mealType} onChange={(event) => setMealType(event.currentTarget.value)}>
        {MEAL_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <input
        type="number"
        placeholder="Calories"
        value={calories}
        onInput={(event) => setCalories(event.currentTarget.value)}
        min="0"
      />
      <div class="macro-row">
        <input
          type="number"
          placeholder="Protein (g)"
          value={protein}
          onInput={(event) => setProtein(event.currentTarget.value)}
          min="0"
        />
        <input
          type="number"
          placeholder="Carbs (g)"
          value={carbs}
          onInput={(event) => setCarbs(event.currentTarget.value)}
          min="0"
        />
        <input
          type="number"
          placeholder="Fat (g)"
          value={fat}
          onInput={(event) => setFat(event.currentTarget.value)}
          min="0"
        />
      </div>
      <div class="add-food-actions">
        <button type="submit">Add</button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
