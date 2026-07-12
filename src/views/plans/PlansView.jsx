import { useState } from 'preact/hooks'
import { PLAN_LIBRARY } from '../../data/planLibrary.js'
import { applyPlanToUser } from '../../data/planLibraryApply.js'
import { parseTrainingPlanMarkdown } from '../../services/planParser.js'
import './plans.css'

export function PlansView({ userId }) {
  const [expandedId, setExpandedId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [addedIds, setAddedIds] = useState(new Set())
  const [error, setError] = useState(null)
  const [customPlan, setCustomPlan] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState(null)

  async function handleAdd(plan) {
    setError(null)
    setBusyId(plan.id)
    try {
      await applyPlanToUser(userId, plan)
      setAddedIds((prev) => new Set(prev).add(plan.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleFileSelect(event) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    setParseError(null)
    setParsing(true)
    setCustomPlan(null)
    try {
      const text = await file.text()
      const plan = await parseTrainingPlanMarkdown(text)
      setCustomPlan(plan)
      setExpandedId(plan.id)
    } catch (err) {
      setParseError(err.message)
    } finally {
      setParsing(false)
    }
  }

  return (
    <section class="plans-view">
      {error && (
        <p class="manage-error" role="alert">
          {error}
        </p>
      )}

      <h1>Plans</h1>
      <p class="plans-intro">
        Browse ready-made training plans and add one to your Split Days — this adds new days
        alongside whatever you already have, it won't delete anything.
      </p>

      {customPlan && (
        <PlanCard
          plan={customPlan}
          expanded={expandedId === customPlan.id}
          added={addedIds.has(customPlan.id)}
          busy={busyId === customPlan.id}
          onToggle={() => setExpandedId(expandedId === customPlan.id ? null : customPlan.id)}
          onAdd={() => handleAdd(customPlan)}
        />
      )}

      {PLAN_LIBRARY.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          expanded={expandedId === plan.id}
          added={addedIds.has(plan.id)}
          busy={busyId === plan.id}
          onToggle={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
          onAdd={() => handleAdd(plan)}
        />
      ))}

      <section class="upload-plan-card">
        <h2>Add Your Own Plan</h2>
        <p class="plans-intro">
          Upload a plan as a .md or .txt file — an LLM reads it and turns it into a plan you can
          preview and add above, same as the built-in ones.
        </p>
        {parseError && (
          <p class="manage-error" role="alert">
            {parseError}
          </p>
        )}
        <label class="upload-plan-button">
          {parsing ? 'Reading plan…' : 'Choose file'}
          <input type="file" accept=".md,.txt,text/markdown,text/plain" disabled={parsing} onChange={handleFileSelect} />
        </label>
      </section>
    </section>
  )
}

function PlanCard({ plan, expanded, added, busy, onToggle, onAdd }) {
  return (
    <section class="plan-card">
      <header>
        <div class="plan-card-title" onClick={onToggle}>
          <h2>{plan.name}</h2>
          <p class="plan-description">{plan.description}</p>
          <span class="plan-day-count">
            {plan.days.length} day{plan.days.length === 1 ? '' : 's'} · tap to {expanded ? 'collapse' : 'preview'}
          </span>
        </div>
        <button type="button" class="add-plan-button" disabled={busy || added} onClick={onAdd}>
          {added ? 'Added ✓' : busy ? 'Adding…' : 'Add to My Splits'}
        </button>
      </header>

      {expanded && (
        <div class="plan-preview">
          {plan.days.map((day) => (
            <div class="plan-preview-day" key={day.name}>
              <h3>{day.name}</h3>
              <ul>
                {day.exercises.map((exercise) => (
                  <li key={exercise.name}>
                    {exercise.name}
                    {exercise.noMetrics && <span class="plan-exercise-meta"> · done/undone</span>}
                    {!exercise.noMetrics && !exercise.isCardio && (exercise.defaultSets || exercise.defaultRepRange) && (
                      <span class="plan-exercise-meta">
                        {' '}
                        · {exercise.defaultSets ?? '—'}×{exercise.defaultRepRange ?? '—'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
