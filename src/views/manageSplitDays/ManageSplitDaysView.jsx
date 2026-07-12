import { useEffect, useState } from 'preact/hooks'
import { listSplitDays, createSplitDay, updateSplitDay, deleteSplitDay } from '../../data/splitDays.js'
import { listExercises, createExercise, updateExercise, deleteExercise } from '../../data/exercises.js'
import { MUSCLE_GROUPS } from '../../utils/muscleGroups.js'
import './manageSplitDays.css'

export function ManageSplitDaysView({ userId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [splitDays, setSplitDays] = useState([])
  const [exercisesByDay, setExercisesByDay] = useState({})
  const [newDayName, setNewDayName] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const days = await listSplitDays()
      const exerciseLists = await Promise.all(
        days.map((day) => listExercises({ splitDayId: day.id }))
      )
      const grouped = {}
      days.forEach((day, i) => {
        grouped[day.id] = exerciseLists[i]
      })
      setSplitDays(days)
      setExercisesByDay(grouped)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddDay(event) {
    event.preventDefault()
    const name = newDayName.trim()
    if (!name) return
    setError(null)
    try {
      const created = await createSplitDay({ userId, name, sortOrder: splitDays.length })
      setSplitDays((prev) => [...prev, created])
      setExercisesByDay((prev) => ({ ...prev, [created.id]: [] }))
      setNewDayName('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRenameDay(day, name) {
    setError(null)
    try {
      const updated = await updateSplitDay(day.id, { name })
      setSplitDays((prev) => prev.map((d) => (d.id === day.id ? updated : d)))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleMoveDay(day, direction) {
    const index = splitDays.findIndex((d) => d.id === day.id)
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= splitDays.length) return

    const other = splitDays[swapIndex]
    setError(null)
    try {
      const [updatedDay, updatedOther] = await Promise.all([
        updateSplitDay(day.id, { sort_order: other.sort_order }),
        updateSplitDay(other.id, { sort_order: day.sort_order }),
      ])
      const next = [...splitDays]
      next[index] = updatedOther
      next[swapIndex] = updatedDay
      next.sort((a, b) => a.sort_order - b.sort_order)
      setSplitDays(next)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteDay(day) {
    const exerciseCount = (exercisesByDay[day.id] ?? []).length
    const message =
      exerciseCount > 0
        ? `Delete "${day.name}"? ${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'} will become unassigned, not deleted — your logged history keeps its own record either way.`
        : `Delete "${day.name}"?`

    if (!window.confirm(message)) return

    setError(null)
    try {
      await deleteSplitDay(day.id)
      setSplitDays((prev) => prev.filter((d) => d.id !== day.id))
      setExercisesByDay((prev) => {
        const next = { ...prev }
        delete next[day.id]
        return next
      })
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddExercise(day, values) {
    setError(null)
    try {
      const existing = exercisesByDay[day.id] ?? []
      const created = await createExercise({
        userId,
        splitDayId: day.id,
        name: values.name,
        muscleGroup: values.muscleGroup,
        defaultSets: values.defaultSets,
        defaultRepRange: values.defaultRepRange,
        isCardio: values.isCardio,
        noMetrics: values.noMetrics,
        sortOrder: existing.length,
      })
      setExercisesByDay((prev) => ({ ...prev, [day.id]: [...(prev[day.id] ?? []), created] }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleUpdateExercise(day, exercise, updates) {
    setError(null)
    try {
      const updated = await updateExercise(exercise.id, updates)
      setExercisesByDay((prev) => ({
        ...prev,
        [day.id]: (prev[day.id] ?? []).map((e) => (e.id === exercise.id ? updated : e)),
      }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteExercise(day, exercise) {
    if (!window.confirm(`Remove "${exercise.name}" from ${day.name}?`)) return

    setError(null)
    try {
      await deleteExercise(exercise.id)
      setExercisesByDay((prev) => ({
        ...prev,
        [day.id]: (prev[day.id] ?? []).filter((e) => e.id !== exercise.id),
      }))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <p class="loading">Loading split days…</p>
  }

  return (
    <section class="manage-split-days">
      {error && (
        <p class="manage-error" role="alert">
          {error}
        </p>
      )}

      <h1>Split Days</h1>

      {splitDays.length === 0 ? (
        <p class="empty-state">No split days yet — add your first one below.</p>
      ) : (
        splitDays.map((day, index) => (
          <SplitDayCard
            key={day.id}
            day={day}
            exercises={exercisesByDay[day.id] ?? []}
            isFirst={index === 0}
            isLast={index === splitDays.length - 1}
            onRename={(name) => handleRenameDay(day, name)}
            onMove={(direction) => handleMoveDay(day, direction)}
            onDelete={() => handleDeleteDay(day)}
            onAddExercise={(values) => handleAddExercise(day, values)}
            onUpdateExercise={(exercise, updates) => handleUpdateExercise(day, exercise, updates)}
            onDeleteExercise={(exercise) => handleDeleteExercise(day, exercise)}
          />
        ))
      )}

      <form class="add-day-form" onSubmit={handleAddDay}>
        <input
          type="text"
          placeholder="New split day (e.g. Upper Body)"
          value={newDayName}
          onInput={(event) => setNewDayName(event.currentTarget.value)}
        />
        <button type="submit">Add day</button>
      </form>
    </section>
  )
}

function SplitDayCard({
  day,
  exercises,
  isFirst,
  isLast,
  onRename,
  onMove,
  onDelete,
  onAddExercise,
  onUpdateExercise,
  onDeleteExercise,
}) {
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(day.name)
  const [addingExercise, setAddingExercise] = useState(false)

  function handleRenameSubmit(event) {
    event.preventDefault()
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== day.name) onRename(trimmed)
    setRenaming(false)
  }

  return (
    <section class="split-day-card">
      <header>
        <div class="split-day-reorder">
          <button type="button" disabled={isFirst} onClick={() => onMove(-1)} aria-label="Move up">
            ↑
          </button>
          <button type="button" disabled={isLast} onClick={() => onMove(1)} aria-label="Move down">
            ↓
          </button>
        </div>

        {renaming ? (
          <form class="rename-form" onSubmit={handleRenameSubmit}>
            <input
              type="text"
              value={nameDraft}
              onInput={(event) => setNameDraft(event.currentTarget.value)}
              autofocus
            />
            <button type="submit">Save</button>
            <button type="button" onClick={() => { setNameDraft(day.name); setRenaming(false) }}>
              Cancel
            </button>
          </form>
        ) : (
          <h2 onClick={() => setRenaming(true)}>{day.name}</h2>
        )}

        <button type="button" class="delete-day" onClick={onDelete} aria-label={`Delete ${day.name}`}>
          Delete
        </button>
      </header>

      {exercises.length === 0 ? (
        <p class="empty-state">No exercises yet.</p>
      ) : (
        <ul class="exercise-list">
          {exercises.map((exercise) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              onUpdate={(updates) => onUpdateExercise(exercise, updates)}
              onDelete={() => onDeleteExercise(exercise)}
            />
          ))}
        </ul>
      )}

      {addingExercise ? (
        <AddExerciseForm
          onAdd={(values) => {
            onAddExercise(values)
            setAddingExercise(false)
          }}
          onCancel={() => setAddingExercise(false)}
        />
      ) : (
        <button type="button" class="add-exercise-button" onClick={() => setAddingExercise(true)}>
          + Add exercise
        </button>
      )}
    </section>
  )
}

function ExerciseRow({ exercise, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(exercise.name)
  const [muscleGroup, setMuscleGroup] = useState(exercise.muscle_group)
  const [defaultSets, setDefaultSets] = useState(exercise.default_sets ?? '')
  const [defaultRepRange, setDefaultRepRange] = useState(exercise.default_rep_range ?? '')
  const [isCardio, setIsCardio] = useState(exercise.is_cardio)
  const [noMetrics, setNoMetrics] = useState(exercise.no_metrics)

  function handleSave(event) {
    event.preventDefault()
    onUpdate({
      name,
      muscle_group: muscleGroup,
      default_sets: defaultSets === '' ? null : Number(defaultSets),
      default_rep_range: defaultRepRange || null,
      is_cardio: isCardio,
      no_metrics: noMetrics,
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <li class="exercise-row editing">
        <form class="edit-exercise-form" onSubmit={handleSave}>
          <input type="text" value={name} onInput={(e) => setName(e.currentTarget.value)} />
          <select value={muscleGroup} onChange={(e) => setMuscleGroup(e.currentTarget.value)}>
            {MUSCLE_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
          {!isCardio && !noMetrics && (
            <div class="edit-exercise-row">
              <input
                type="number"
                placeholder="sets"
                value={defaultSets}
                onInput={(e) => setDefaultSets(e.currentTarget.value)}
                min="0"
              />
              <input
                type="text"
                placeholder="rep range (e.g. 8-12)"
                value={defaultRepRange}
                onInput={(e) => setDefaultRepRange(e.currentTarget.value)}
              />
            </div>
          )}
          <label class="cardio-toggle">
            <input
              type="checkbox"
              checked={isCardio}
              onChange={(e) => setIsCardio(e.currentTarget.checked)}
            />
            Cardio (log time instead of weight/reps)
          </label>
          <label class="cardio-toggle">
            <input
              type="checkbox"
              checked={noMetrics}
              onChange={(e) => setNoMetrics(e.currentTarget.checked)}
            />
            No metrics (just mark done/undone — e.g. warm-up drills)
          </label>
          <div class="edit-exercise-actions">
            <button type="submit">Save</button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li class="exercise-row">
      <div class="exercise-row-info" onClick={() => setEditing(true)}>
        <span class="exercise-name">{exercise.name}</span>
        <span class="exercise-meta">
          {exercise.muscle_group}
          {exercise.no_metrics
            ? ' · done/undone'
            : exercise.is_cardio
              ? ' · cardio'
              : exercise.default_sets || exercise.default_rep_range
                ? ` · ${exercise.default_sets ?? '—'}×${exercise.default_rep_range ?? '—'}`
                : ''}
        </span>
      </div>
      <button
        type="button"
        class="remove-exercise"
        onClick={onDelete}
        aria-label={`Remove ${exercise.name}`}
      >
        ×
      </button>
    </li>
  )
}

function AddExerciseForm({ onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [muscleGroup, setMuscleGroup] = useState(MUSCLE_GROUPS[0])
  const [defaultSets, setDefaultSets] = useState('')
  const [defaultRepRange, setDefaultRepRange] = useState('')
  const [isCardio, setIsCardio] = useState(false)
  const [noMetrics, setNoMetrics] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    onAdd({
      name: trimmedName,
      muscleGroup,
      defaultSets: defaultSets === '' ? null : Number(defaultSets),
      defaultRepRange: defaultRepRange || null,
      isCardio,
      noMetrics,
    })
  }

  return (
    <form class="add-exercise-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Exercise name"
        value={name}
        onInput={(event) => setName(event.currentTarget.value)}
        autofocus
      />
      <select value={muscleGroup} onChange={(event) => setMuscleGroup(event.currentTarget.value)}>
        {MUSCLE_GROUPS.map((group) => (
          <option key={group} value={group}>
            {group}
          </option>
        ))}
      </select>
      {!isCardio && !noMetrics && (
        <div class="edit-exercise-row">
          <input
            type="number"
            placeholder="sets"
            value={defaultSets}
            onInput={(event) => setDefaultSets(event.currentTarget.value)}
            min="0"
          />
          <input
            type="text"
            placeholder="rep range (e.g. 8-12)"
            value={defaultRepRange}
            onInput={(event) => setDefaultRepRange(event.currentTarget.value)}
          />
        </div>
      )}
      <label class="cardio-toggle">
        <input
          type="checkbox"
          checked={isCardio}
          onChange={(event) => setIsCardio(event.currentTarget.checked)}
        />
        Cardio (log time instead of weight/reps)
      </label>
      <label class="cardio-toggle">
        <input
          type="checkbox"
          checked={noMetrics}
          onChange={(event) => setNoMetrics(event.currentTarget.checked)}
        />
        No metrics (just mark done/undone — e.g. warm-up drills)
      </label>
      <div class="edit-exercise-actions">
        <button type="submit">Add</button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
