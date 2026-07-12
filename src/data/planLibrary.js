// Pure data only — no supabase import — so this file can be imported both
// from the browser (PlansView) and from plain Node scripts (scripts/seedAccount.mjs),
// which can't resolve supabaseClient.js's import.meta.env.

// Every day opens with the same 3-drill Common Warm-Up plus a muscle-specific
// add-on (Push/Pull/Leg) - prepended into that day's exercise list rather than
// tracked as a separate split day, since the doc ties each add-on to specific
// training days (Push add-on on Days 1 & 4, etc). All warm-up items are
// noMetrics: true - no weight/reps/duration, just a done/undone toggle.
const COMMON_WARMUP = [
  { name: 'Jumping Jacks (1 min)', muscleGroup: 'Cardio', noMetrics: true },
  { name: 'Torso Twists (10 each side)', muscleGroup: 'Cardio', noMetrics: true },
  { name: 'Ankle Rotations (10 each side)', muscleGroup: 'Cardio', noMetrics: true },
]

const PUSH_WARMUP_ADDON = [
  { name: 'Arm Circles Fwd/Back (20 sec each direction)', muscleGroup: 'Cardio', noMetrics: true },
  { name: 'Shoulder Pass-Throughs (10 reps)', muscleGroup: 'Cardio', noMetrics: true },
  { name: 'Doorway/Wall Chest Stretch (20 sec each side)', muscleGroup: 'Cardio', noMetrics: true },
  { name: 'Push-Up to Downward Dog (8 reps)', muscleGroup: 'Cardio', noMetrics: true },
  { name: 'Scapular Push-Ups (10 reps)', muscleGroup: 'Cardio', noMetrics: true },
]

const PULL_WARMUP_ADDON = [
  { name: 'Cat-Cow Stretch (10 reps)', muscleGroup: 'Cardio', noMetrics: true },
  { name: 'Overhead Side-Bend Lat Stretch (20 sec each side)', muscleGroup: 'Cardio', noMetrics: true },
  { name: 'Band Pull-Aparts (15 reps)', muscleGroup: 'Cardio', noMetrics: true },
  { name: 'Thoracic Spine Rotations (8 reps each side)', muscleGroup: 'Cardio', noMetrics: true },
  { name: 'Wrist/Forearm Circles (10 each direction)', muscleGroup: 'Cardio', noMetrics: true },
]

const LEG_WARMUP_ADDON = [
  { name: 'Hip Circles (10 each direction)', muscleGroup: 'Cardio', noMetrics: true },
  { name: 'Leg Swings Front-Back & Side-Side (10 each leg)', muscleGroup: 'Cardio', noMetrics: true },
  { name: 'Bodyweight Squats (15 reps)', muscleGroup: 'Cardio', noMetrics: true },
  { name: 'Walking Lunges (10 each leg)', muscleGroup: 'Cardio', noMetrics: true },
  { name: 'Glute Bridges (15 reps)', muscleGroup: 'Cardio', noMetrics: true },
]

export const RECOMP_PPL_6DAY = {
  id: 'recomp-ppl-6day',
  name: 'Push/Pull/Legs — Recomp (6-Day)',
  description:
    'Two-week rotation blending strength (Days 1-3, 6-10 reps) and hypertrophy (Days 4-6, 12-15 reps) phases, each muscle group hit twice weekly. Every day opens with a common + muscle-specific warm-up, and Push/Pull days end with a short cardio finisher.',
  days: [
    {
      name: 'Push (Strength)',
      exercises: [
        ...COMMON_WARMUP,
        ...PUSH_WARMUP_ADDON,
        { name: 'Flat Barbell Bench Press Station', muscleGroup: 'Chest', defaultSets: 4, defaultRepRange: '6-8' },
        { name: 'Incline Barbell Bench Press', muscleGroup: 'Chest', defaultSets: 3, defaultRepRange: '8-10' },
        { name: 'Seated Shoulder Press', muscleGroup: 'Shoulders', defaultSets: 3, defaultRepRange: '8-10' },
        { name: 'Chest Press Machine', muscleGroup: 'Chest', defaultSets: 3, defaultRepRange: '10-12' },
        { name: 'Standing Lateral Raise Machine', muscleGroup: 'Shoulders', defaultSets: 3, defaultRepRange: '12-15' },
        { name: 'Triceps Pushdown (Dual Cable Cross)', muscleGroup: 'Triceps', defaultSets: 3, defaultRepRange: '12-15' },
        { name: 'Power Tower Dips', muscleGroup: 'Triceps', defaultSets: 2, defaultRepRange: 'max reps' },
        { name: 'Cardio Finisher (Treadmill/Cycle)', muscleGroup: 'Cardio', isCardio: true, defaultRepRange: '15 min moderate' },
      ],
    },
    {
      name: 'Pull (Strength)',
      exercises: [
        ...COMMON_WARMUP,
        ...PULL_WARMUP_ADDON,
        { name: 'Lat Pulldown Machine', muscleGroup: 'Back', defaultSets: 4, defaultRepRange: '8-10' },
        { name: 'T-Bar Row', muscleGroup: 'Back', defaultSets: 3, defaultRepRange: '8-10' },
        { name: 'Seated Cable Row', muscleGroup: 'Back', defaultSets: 3, defaultRepRange: '10-12' },
        { name: 'Low Row', muscleGroup: 'Back', defaultSets: 3, defaultRepRange: '10-12' },
        { name: 'Longpull', muscleGroup: 'Back', defaultSets: 3, defaultRepRange: '12' },
        { name: 'Rear Delt/Pec Fly (reverse)', muscleGroup: 'Shoulders', defaultSets: 3, defaultRepRange: '15' },
        { name: 'Preacher Curl Machine', muscleGroup: 'Biceps', defaultSets: 3, defaultRepRange: '10-12' },
        { name: 'Cardio Finisher (Elliptical)', muscleGroup: 'Cardio', isCardio: true, defaultRepRange: '15 min moderate' },
      ],
    },
    {
      name: 'Legs + Core (Strength)',
      exercises: [
        ...COMMON_WARMUP,
        ...LEG_WARMUP_ADDON,
        { name: 'Hack Squat Machine', muscleGroup: 'Legs', defaultSets: 4, defaultRepRange: '8-10' },
        { name: 'Leverage Squat', muscleGroup: 'Legs', defaultSets: 3, defaultRepRange: '8-10' },
        { name: 'Leg Press', muscleGroup: 'Legs', defaultSets: 3, defaultRepRange: '10-12' },
        { name: 'Leg Curl', muscleGroup: 'Legs', defaultSets: 3, defaultRepRange: '12' },
        { name: 'Leg Extension', muscleGroup: 'Legs', defaultSets: 3, defaultRepRange: '12-15' },
        { name: 'Seated Calf Raise', muscleGroup: 'Calves', defaultSets: 4, defaultRepRange: '15-20' },
        { name: 'Roman Chair Leg Raises', muscleGroup: 'Core', defaultSets: 3, defaultRepRange: '12-15' },
        { name: 'Abdominal Crunch Bench', muscleGroup: 'Core', defaultSets: 3, defaultRepRange: '15' },
        { name: 'Russian Twists', muscleGroup: 'Core', defaultSets: 3, defaultRepRange: '20' },
      ],
    },
    {
      name: 'Push (Hypertrophy)',
      exercises: [
        ...COMMON_WARMUP,
        ...PUSH_WARMUP_ADDON,
        { name: 'Incline Pec Fly', muscleGroup: 'Chest', defaultSets: 3, defaultRepRange: '12-15' },
        { name: 'Smith Machine Flat/Incline Press', muscleGroup: 'Chest', defaultSets: 3, defaultRepRange: '10-12' },
        { name: 'Cable Crossover Machine (chest fly)', muscleGroup: 'Chest', defaultSets: 3, defaultRepRange: '15' },
        { name: 'Seated Shoulder Press', muscleGroup: 'Shoulders', defaultSets: 3, defaultRepRange: '10-12' },
        { name: 'Standing Lateral Raise Machine', muscleGroup: 'Shoulders', defaultSets: 3, defaultRepRange: '15-20 drop set' },
        { name: 'EZ Curl Bar Skull Crushers', muscleGroup: 'Triceps', defaultSets: 3, defaultRepRange: '12' },
        { name: 'Triceps Kickback (Functional Trainer)', muscleGroup: 'Triceps', defaultSets: 2, defaultRepRange: '15' },
      ],
    },
    {
      name: 'Pull (Hypertrophy)',
      exercises: [
        ...COMMON_WARMUP,
        ...PULL_WARMUP_ADDON,
        { name: 'Lat Pulldown (wide grip)', muscleGroup: 'Back', defaultSets: 3, defaultRepRange: '12' },
        { name: 'Seated Cable Row (close grip)', muscleGroup: 'Back', defaultSets: 3, defaultRepRange: '12-15' },
        { name: 'Low Row', muscleGroup: 'Back', defaultSets: 3, defaultRepRange: '12' },
        { name: 'Longpull', muscleGroup: 'Back', defaultSets: 3, defaultRepRange: '12-15' },
        { name: 'T-Bar Row (lighter, higher reps)', muscleGroup: 'Back', defaultSets: 3, defaultRepRange: '12' },
        { name: 'Rear Delt/Pec Fly', muscleGroup: 'Shoulders', defaultSets: 3, defaultRepRange: '15' },
        { name: 'EZ Curl Bar Bicep Curl', muscleGroup: 'Biceps', defaultSets: 3, defaultRepRange: '12' },
        { name: 'Preacher Curl Machine (burnout)', muscleGroup: 'Biceps', defaultSets: 2, defaultRepRange: '15' },
      ],
    },
    {
      name: 'Legs + Core (Hypertrophy)',
      exercises: [
        ...COMMON_WARMUP,
        ...LEG_WARMUP_ADDON,
        { name: 'Leg Press', muscleGroup: 'Legs', defaultSets: 4, defaultRepRange: '12-15' },
        { name: 'Hack Squat (lighter, higher reps)', muscleGroup: 'Legs', defaultSets: 3, defaultRepRange: '15' },
        { name: 'Romanian Deadlift (dumbbells)', muscleGroup: 'Legs', defaultSets: 3, defaultRepRange: '12' },
        { name: 'Leg Extension', muscleGroup: 'Legs', defaultSets: 3, defaultRepRange: '15' },
        { name: 'Leg Curl', muscleGroup: 'Legs', defaultSets: 3, defaultRepRange: '15' },
        { name: 'Seated Calf Raise', muscleGroup: 'Calves', defaultSets: 4, defaultRepRange: '20' },
        { name: 'Plyo Box Step-ups', muscleGroup: 'Legs', defaultSets: 3, defaultRepRange: '12/leg' },
        { name: 'Seated Leg Crunch', muscleGroup: 'Core', defaultSets: 3, defaultRepRange: '15' },
        { name: 'Roman Chair Leg Raises', muscleGroup: 'Core', defaultSets: 3, defaultRepRange: '15' },
      ],
    },
  ],
}

export const CLASSIC_PPL_4DAY = {
  id: 'classic-ppl-4day',
  name: 'Classic PPL (4-Day)',
  description: 'The app\'s original starter split — Push, Pull, Legs, plus a dedicated Cardio day.',
  days: [
    {
      name: 'Push',
      exercises: [
        { name: 'Bench Press', muscleGroup: 'Chest', defaultSets: 4, defaultRepRange: '6-10' },
        { name: 'Overhead Press', muscleGroup: 'Shoulders', defaultSets: 3, defaultRepRange: '8-12' },
        { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', defaultSets: 3, defaultRepRange: '8-12' },
        { name: 'Lateral Raise', muscleGroup: 'Shoulders', defaultSets: 3, defaultRepRange: '12-15' },
        { name: 'Triceps Pushdown', muscleGroup: 'Triceps', defaultSets: 3, defaultRepRange: '10-15' },
      ],
    },
    {
      name: 'Pull',
      exercises: [
        { name: 'Deadlift', muscleGroup: 'Back', defaultSets: 3, defaultRepRange: '5-8' },
        { name: 'Pull-Up', muscleGroup: 'Back', defaultSets: 4, defaultRepRange: '6-10' },
        { name: 'Barbell Row', muscleGroup: 'Back', defaultSets: 3, defaultRepRange: '8-12' },
        { name: 'Face Pull', muscleGroup: 'Shoulders', defaultSets: 3, defaultRepRange: '12-15' },
        { name: 'Barbell Curl', muscleGroup: 'Biceps', defaultSets: 3, defaultRepRange: '10-15' },
      ],
    },
    {
      name: 'Legs',
      exercises: [
        { name: 'Squat', muscleGroup: 'Legs', defaultSets: 4, defaultRepRange: '6-10' },
        { name: 'Romanian Deadlift', muscleGroup: 'Legs', defaultSets: 3, defaultRepRange: '8-12' },
        { name: 'Leg Press', muscleGroup: 'Legs', defaultSets: 3, defaultRepRange: '10-15' },
        { name: 'Leg Curl', muscleGroup: 'Legs', defaultSets: 3, defaultRepRange: '10-15' },
        { name: 'Standing Calf Raise', muscleGroup: 'Calves', defaultSets: 4, defaultRepRange: '12-20' },
      ],
    },
    {
      name: 'Cardio',
      exercises: [
        { name: 'Walk', muscleGroup: 'Cardio', isCardio: true },
        { name: 'Run', muscleGroup: 'Cardio', isCardio: true },
        { name: 'Cycling', muscleGroup: 'Cardio', isCardio: true },
      ],
    },
  ],
}

export const PLAN_LIBRARY = [RECOMP_PPL_6DAY, CLASSIC_PPL_4DAY]
