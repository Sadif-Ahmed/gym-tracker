import { useRef, useState } from 'preact/hooks'
import { identifyEquipmentFromPhoto } from '../../services/equipmentScanner.js'
import { fileToBase64, downscalePhoto } from '../../utils/photo.js'
import { ExerciseTutorial } from '../shared/ExerciseTutorial.jsx'
import './equipment.css'

export function EquipmentView() {
  const [mode, setMode] = useState('pick') // pick | describe | identifying | result
  const [error, setError] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [description, setDescription] = useState('')
  const [result, setResult] = useState(null)
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)

  async function handlePhotoSelected(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError(null)
    try {
      const resized = await downscalePhoto(file)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPhotoFile(resized)
      setPreviewUrl(URL.createObjectURL(resized))
      setResult(null)
      setMode('describe')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleIdentify() {
    setMode('identifying')
    setError(null)
    try {
      const base64 = await fileToBase64(photoFile)
      setResult(await identifyEquipmentFromPhoto(base64, description.trim()))
      setMode('result')
    } catch (err) {
      setError(err.message)
      setMode('describe')
    }
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPhotoFile(null)
    setPreviewUrl(null)
    setDescription('')
    setResult(null)
    setMode('pick')
  }

  return (
    <section class="equipment-view">
      <h1>Equipment</h1>
      <p class="equipment-intro">
        Snap a machine or piece of gear to see exercises you can do with it and the muscles each one works.
      </p>

      {error && (
        <p class="equipment-error" role="alert">
          {error}
        </p>
      )}

      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        class="sr-only"
        onChange={handlePhotoSelected}
      />
      <input type="file" accept="image/*" ref={galleryInputRef} class="sr-only" onChange={handlePhotoSelected} />

      {previewUrl && <img src={previewUrl} alt="Selected equipment" class="equipment-preview" />}

      {mode === 'pick' && (
        <div class="equipment-actions">
          <button type="button" onClick={() => cameraInputRef.current?.click()}>
            📷 Take photo
          </button>
          <button type="button" onClick={() => galleryInputRef.current?.click()}>
            🖼️ Upload from gallery
          </button>
        </div>
      )}

      {mode === 'describe' && (
        <div class="equipment-describe">
          <label for="equipment-description">
            Note (optional) <span class="field-hint">e.g. cable machine with a rope attachment</span>
          </label>
          <textarea
            id="equipment-description"
            value={description}
            onInput={(event) => setDescription(event.currentTarget.value)}
            rows={2}
          />
          <div class="equipment-actions">
            <button type="button" class="primary" onClick={handleIdentify}>
              Find exercises
            </button>
            <button type="button" onClick={reset}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'identifying' && <p class="empty-state">Looking at your photo…</p>}

      {mode === 'result' && result && (
        <>
          <h2 class="equipment-name">{result.equipment}</h2>
          {!result.isGymEquipment || result.exercises.length === 0 ? (
            <p class="empty-state">That doesn't look like gym equipment. Try another photo.</p>
          ) : (
            <ul class="equipment-exercises">
              {result.exercises.map((exercise) => (
                <li key={exercise.name}>
                  <div class="equipment-exercise-head">
                    <span class="equipment-exercise-name">{exercise.name}</span>
                    <span class="muscle-tag">{exercise.muscleGroup}</span>
                  </div>
                  <p class="equipment-targets">Works: {exercise.targetMuscles}</p>
                  {exercise.cue && <p class="equipment-cue">Tip: {exercise.cue}</p>}
                  <ExerciseTutorial name={exercise.name} />
                </li>
              ))}
            </ul>
          )}
          <div class="equipment-actions">
            <button type="button" onClick={reset}>
              Scan another
            </button>
          </div>
        </>
      )}
    </section>
  )
}
