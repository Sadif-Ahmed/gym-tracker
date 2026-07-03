import { useEffect, useRef, useState } from 'preact/hooks'
import { listFoodEntriesForDate, createFoodEntry, deleteFoodEntry } from '../../data/foodEntries.js'
import { getUserGoal } from '../../data/userGoal.js'
import { latestWeightEntry } from '../../data/weightEntries.js'
import { getDailySteps } from '../../data/dailySteps.js'
import { todayISO } from '../../utils/dates.js'
import { computeDailyTarget } from '../../utils/tdeeCalculator.js'
import { stepsToCalories } from '../../utils/stepCalorieCalculator.js'
import { estimateFoodFromPhoto } from '../../services/calorieEstimation.js'
import './nutrition.css'

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

// The bridge is set up to sync roughly hourly (Settings), so a gap much
// longer than that means the automation stopped firing, not just that an
// hour hasn't ticked over yet.
const STALE_AFTER_HOURS = 2

function formatStepsFreshness(syncedAt) {
  const minutesAgo = Math.round((Date.now() - new Date(syncedAt).getTime()) / 60000)
  if (minutesAgo < 60) return `Synced ${minutesAgo}m ago`
  const hoursAgo = Math.round(minutesAgo / 60)
  const stale = hoursAgo >= STALE_AFTER_HOURS ? ' — stale' : ''
  if (hoursAgo < 24) return `Synced ${hoursAgo}h ago${stale}`
  const daysAgo = Math.round(hoursAgo / 24)
  return `Synced ${daysAgo}d ago — stale`
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// Vision models downsample internally regardless, so shipping a full-res
// phone photo (often 8-12MB+) is pure waste - it eats into the Edge
// Function's CPU-time/memory budget and slows the upload for nothing.
// Cap the long edge at 1024px and re-encode as JPEG before sending.
const MAX_PHOTO_DIMENSION = 1024
const PHOTO_JPEG_QUALITY = 0.8

async function downscalePhoto(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to process photo'))),
      'image/jpeg',
      PHOTO_JPEG_QUALITY
    )
  })
}

export function NutritionView({ userId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [entries, setEntries] = useState([])
  const [target, setTarget] = useState(null)
  const [stepsToday, setStepsToday] = useState(null)
  const [stepCalories, setStepCalories] = useState(0)
  const [mode, setMode] = useState('closed') // closed | manual | estimating | review
  const [photoEstimate, setPhotoEstimate] = useState(null)
  const fileInputRef = useRef(null)

  const today = todayISO()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [foodEntries, goal, weight, steps] = await Promise.all([
        listFoodEntriesForDate(today),
        getUserGoal(),
        latestWeightEntry(),
        getDailySteps(today),
      ])
      setEntries(foodEntries)
      const currentWeight = weight?.weight_kg ?? goal?.starting_weight_kg ?? null
      setTarget(computeDailyTarget(goal, currentWeight))
      setStepsToday(steps)
      setStepCalories(stepsToCalories(steps?.steps, currentWeight))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePhotoSelected(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setMode('estimating')
    setError(null)
    try {
      const resized = await downscalePhoto(file)
      const base64 = await fileToBase64(resized)
      const estimate = await estimateFoodFromPhoto(base64)
      setPhotoEstimate(estimate)
      setMode('review')
    } catch (err) {
      setError(err.message)
      setMode('closed')
    }
  }

  async function handleAdd(values) {
    setError(null)
    try {
      const created = await createFoodEntry({ userId, date: today, ...values })
      setEntries((prev) => [...prev, created])
      setMode('closed')
      setPhotoEstimate(null)
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

      <div class="steps-summary">
        <div>
          <span class="eyebrow">Steps today</span>
          <span class="num">{stepsToday ? stepsToday.steps.toLocaleString() : '—'}</span>
        </div>
        {stepsToday && (
          <div>
            <span class="eyebrow">Est. calories</span>
            <span class="num">{Math.round(stepCalories)}</span>
          </div>
        )}
        <p class="steps-freshness">
          {stepsToday
            ? formatStepsFreshness(stepsToday.synced_at)
            : 'Not synced yet today — set up the bridge in Settings.'}
        </p>
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

      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        class="sr-only"
        onChange={handlePhotoSelected}
      />

      {mode === 'closed' && (
        <div class="food-add-actions">
          <button type="button" class="add-food-button" onClick={() => setMode('manual')}>
            + Log food
          </button>
          <button type="button" class="add-food-button" onClick={() => fileInputRef.current?.click()}>
            📷 Estimate from photo
          </button>
        </div>
      )}

      {mode === 'estimating' && <p class="empty-state">Estimating from photo…</p>}

      {mode === 'manual' && <AddFoodForm onAdd={handleAdd} onCancel={() => setMode('closed')} />}

      {mode === 'review' && (
        <AddFoodForm
          onAdd={handleAdd}
          onCancel={() => {
            setMode('closed')
            setPhotoEstimate(null)
          }}
          initialValues={photoEstimate}
          source="llm_photo"
        />
      )}
    </section>
  )
}

function AddFoodForm({ onAdd, onCancel, initialValues, source = 'manual' }) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [mealType, setMealType] = useState(MEAL_TYPES[0])
  const [calories, setCalories] = useState(
    initialValues?.calories != null ? String(initialValues.calories) : ''
  )
  const [protein, setProtein] = useState(
    initialValues?.protein_g != null ? String(initialValues.protein_g) : ''
  )
  const [carbs, setCarbs] = useState(initialValues?.carbs_g != null ? String(initialValues.carbs_g) : '')
  const [fat, setFat] = useState(initialValues?.fat_g != null ? String(initialValues.fat_g) : '')

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
      source,
    })
  }

  return (
    <form class="add-food-form" onSubmit={handleSubmit}>
      {source === 'llm_photo' && (
        <p class="estimate-note">Estimated from your photo — review and adjust before saving.</p>
      )}
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
        <button type="submit">{source === 'llm_photo' ? 'Save' : 'Add'}</button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
