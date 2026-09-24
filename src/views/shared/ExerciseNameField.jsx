import { EXERCISE_CATALOG, findCatalogExercise } from '../../data/exerciseCatalog.js'

// Name input that suggests exercises from the verified catalog (native
// <datalist>, so any other name can still be typed). Picking a catalog
// exercise calls onMatch with its entry so the form can prefill the rest.
export function ExerciseNameField({ id, value, onInput, onMatch }) {
  const listId = `${id}-catalog`
  const trimmed = value.trim()
  const match = trimmed ? findCatalogExercise(trimmed) : null

  function handleInput(event) {
    const next = event.currentTarget.value
    onInput(next)
    const entry = findCatalogExercise(next.trim())
    if (entry) onMatch(entry)
  }

  return (
    <>
      <input
        id={id}
        type="text"
        placeholder="Search exercises or type a new one"
        list={listId}
        value={value}
        onInput={handleInput}
        autocomplete="off"
        autofocus
      />
      <datalist id={listId}>
        {EXERCISE_CATALOG.map((entry) => (
          <option key={entry.name} value={entry.name} />
        ))}
      </datalist>
      {trimmed && (
        <p class={`catalog-hint${match ? ' verified' : ''}`}>
          {match
            ? `From the exercise list · ${match.muscleGroup} · ${KIND_LABEL[match.kind]}`
            : 'Not in the exercise list: it will be added as a new exercise'}
        </p>
      )}
    </>
  )
}

const KIND_LABEL = { reps: 'weight × reps', timed: 'timed', warmup: 'mark done' }
