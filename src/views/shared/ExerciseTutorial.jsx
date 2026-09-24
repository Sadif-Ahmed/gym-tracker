import { useState } from 'preact/hooks'
import { tutorialFor } from '../../data/exerciseCatalog.js'

// "▶ Form tutorial" toggle that plays the exercise's YouTube tutorial inline.
// The iframe only mounts when opened, so a workout page with 15 exercises
// doesn't load 15 players. Renders nothing for exercises without a tutorial.
export function ExerciseTutorial({ name }) {
  const [open, setOpen] = useState(false)
  const videoId = tutorialFor(name)
  if (!videoId) return null

  return (
    <div class="exercise-tutorial">
      <button
        type="button"
        class="tutorial-toggle"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? 'Hide tutorial' : '▶ Form tutorial'}
      </button>
      {open && (
        <div class="tutorial-frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
            title={`${name}: form tutorial`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      )}
    </div>
  )
}
