// Pure data only (no supabase import) so plain Node scripts can use it too.
//
// The verified exercise list offered when adding an exercise. Each entry's
// MET comes from the Adult Compendium of Physical Activities activity it
// maps to, rather than an LLM guess, so the same exercise always burns the
// same calories regardless of which split day it sits on. Anything not in
// this list still works - it just falls back to LLM classification on Finish.
//
// kind: 'reps'   - logged as kg × reps
//       'timed'  - logged as minutes (is_cardio): cardio, planks, holds
//       'warmup' - done/not done (no_metrics)
const MET = {
  stretch: 2.3, // stretching, mild; joint mobility drills
  lightCalisthenics: 2.8, // calisthenics, light effort
  calisthenics: 3.8, // calisthenics (push-ups, sit-ups, lunges), moderate effort
  vigorousCalisthenics: 8.0, // calisthenics (jumping jacks), vigorous effort
  isolation: 3.5, // resistance training, multiple exercises, 8-15 reps
  compound: 5.0, // resistance training, squats / compound lifts
  heavy: 6.0, // resistance training, power lifting, vigorous; heavy carries
}

const warmup = (name, met) => ({ name, muscleGroup: 'Other', kind: 'warmup', met })
const reps = (name, muscleGroup, met) => ({ name, muscleGroup, kind: 'reps', met })
const timed = (name, muscleGroup, met) => ({ name, muscleGroup, kind: 'timed', met })

export const EXERCISE_CATALOG = [
  // Warm-ups
  warmup('Jumping Jacks (1 min)', MET.vigorousCalisthenics),
  warmup('Torso Twists (10 each side)', MET.lightCalisthenics),
  warmup('Ankle Rotations (10 each side)', MET.stretch),
  warmup('Arm Circles Fwd/Back (20 sec each direction)', MET.lightCalisthenics),
  warmup('Shoulder Pass-Throughs (10 reps)', MET.stretch),
  warmup('Doorway/Wall Chest Stretch (20 sec each side)', MET.stretch),
  warmup('Push-Up to Downward Dog (8 reps)', MET.calisthenics),
  warmup('Scapular Push-Ups (10 reps)', MET.calisthenics),
  warmup('Cat-Cow Stretch (10 reps)', MET.stretch),
  warmup('Overhead Side-Bend Lat Stretch (20 sec each side)', MET.stretch),
  warmup('Band Pull-Aparts (15 reps)', MET.lightCalisthenics),
  warmup('Thoracic Spine Rotations (8 reps each side)', MET.stretch),
  warmup('Wrist/Forearm Circles (10 each direction)', MET.stretch),
  warmup('Hip Circles (10 each direction)', MET.stretch),
  warmup('Leg Swings Front-Back & Side-Side (10 each leg)', MET.lightCalisthenics),
  warmup('Bodyweight Squats (15 reps)', MET.calisthenics),
  warmup('Walking Lunges (10 each leg)', MET.calisthenics),
  warmup('Glute Bridges (15 reps)', MET.lightCalisthenics),

  // Chest
  reps('Bench Press', 'Chest', MET.compound),
  reps('Flat Barbell Bench Press Station', 'Chest', MET.compound),
  reps('Incline Barbell Bench Press', 'Chest', MET.compound),
  reps('Decline Bench Press', 'Chest', MET.compound),
  reps('Dumbbell Bench Press', 'Chest', MET.compound),
  reps('Incline Dumbbell Press', 'Chest', MET.compound),
  reps('Smith Machine Flat/Incline Press', 'Chest', MET.compound),
  reps('Chest Press Machine', 'Chest', MET.isolation),
  reps('Pec Deck Fly', 'Chest', MET.isolation),
  reps('Incline Pec Fly', 'Chest', MET.isolation),
  reps('Dumbbell Fly', 'Chest', MET.isolation),
  reps('Cable Crossover Machine', 'Chest', MET.isolation),
  reps('Cable Crossover Machine (chest fly)', 'Chest', MET.isolation),
  reps('Push-Ups', 'Chest', MET.calisthenics),

  // Back
  reps('Deadlift', 'Back', MET.heavy),
  reps('Pull-Up', 'Back', MET.calisthenics),
  reps('Chin-Up', 'Back', MET.calisthenics),
  reps('Lat Pulldown', 'Back', MET.isolation),
  reps('Lat Pulldown Machine', 'Back', MET.isolation),
  reps('Lat Pulldown (wide grip)', 'Back', MET.isolation),
  reps('Barbell Row', 'Back', MET.compound),
  reps('T-Bar Row', 'Back', MET.compound),
  reps('T-Bar Row (lighter, higher reps)', 'Back', MET.compound),
  reps('Dumbbell Row', 'Back', MET.compound),
  reps('Seated Cable Row', 'Back', MET.isolation),
  reps('Seated Cable Row (close grip)', 'Back', MET.isolation),
  reps('Low Row', 'Back', MET.isolation),
  reps('Longpull', 'Back', MET.isolation),
  reps('Back Extension', 'Back', MET.isolation),
  reps('Shrugs', 'Back', MET.isolation),

  // Shoulders
  reps('Overhead Press', 'Shoulders', MET.compound),
  reps('Seated Shoulder Press', 'Shoulders', MET.compound),
  reps('Dumbbell Shoulder Press', 'Shoulders', MET.compound),
  reps('Arnold Press', 'Shoulders', MET.compound),
  reps('Lateral Raise', 'Shoulders', MET.isolation),
  reps('Standing Lateral Raise', 'Shoulders', MET.isolation),
  reps('Standing Lateral Raise Machine', 'Shoulders', MET.isolation),
  reps('Front Raise', 'Shoulders', MET.isolation),
  reps('Face Pull', 'Shoulders', MET.isolation),
  reps('Rear Delt/Pec Fly', 'Shoulders', MET.isolation),
  reps('Rear Delt/Pec Fly (reverse)', 'Shoulders', MET.isolation),
  reps('Upright Row', 'Shoulders', MET.isolation),

  // Arms
  reps('Barbell Curl', 'Biceps', MET.isolation),
  reps('EZ Curl Bar Bicep Curl', 'Biceps', MET.isolation),
  reps('Dumbbell Curl', 'Biceps', MET.isolation),
  reps('Hammer Curl', 'Biceps', MET.isolation),
  reps('Cable Curl', 'Biceps', MET.isolation),
  reps('Preacher Curl Machine', 'Biceps', MET.isolation),
  reps('Preacher Curl Machine (burnout)', 'Biceps', MET.isolation),
  reps('Triceps Pushdown', 'Triceps', MET.isolation),
  reps('Triceps Pushdown (Dual Cable Cross)', 'Triceps', MET.isolation),
  reps('Triceps Rope Pushdown', 'Triceps', MET.isolation),
  reps('EZ Curl Bar Skull Crushers', 'Triceps', MET.isolation),
  reps('Overhead Triceps Extension', 'Triceps', MET.isolation),
  reps('Triceps Kickback (Functional Trainer)', 'Triceps', MET.isolation),
  reps('Close-Grip Bench Press', 'Triceps', MET.compound),
  reps('Power Tower Dips', 'Triceps', MET.calisthenics),

  // Legs
  reps('Squat', 'Legs', MET.compound),
  reps('Front Squat', 'Legs', MET.compound),
  reps('Hack Squat', 'Legs', MET.compound),
  reps('Hack Squat Machine', 'Legs', MET.compound),
  reps('Hack Squat (lighter, higher reps)', 'Legs', MET.compound),
  reps('Leverage Squat', 'Legs', MET.compound),
  reps('Leg Press', 'Legs', MET.compound),
  reps('Bulgarian Split Squat', 'Legs', MET.compound),
  reps('Dumbbell Lunges', 'Legs', MET.compound),
  reps('Romanian Deadlift', 'Legs', MET.compound),
  reps('Romanian Deadlift (dumbbells)', 'Legs', MET.compound),
  reps('Hip Thrust', 'Legs', MET.compound),
  reps('Glute Bridges', 'Legs', MET.compound),
  reps('Weighted Step Ups', 'Legs', MET.compound),
  reps('Plyo Box Step-ups', 'Legs', MET.compound),
  reps('Eccentric Step Downs', 'Legs', MET.calisthenics),
  reps('Leg Curl', 'Legs', MET.isolation),
  reps('Leg Extension', 'Legs', MET.isolation),
  reps('Standing Calf Raise', 'Calves', MET.isolation),
  reps('Seated Calf Raise', 'Calves', MET.isolation),

  // Core
  reps('Crunches', 'Core', MET.calisthenics),
  reps('Decline Crunches', 'Core', MET.calisthenics),
  reps('Abdominal Crunch Bench', 'Core', MET.calisthenics),
  reps('Abdominal Crunch Machine', 'Core', MET.isolation),
  reps('Kneeling Cable Crunches', 'Core', MET.isolation),
  reps('Seated Leg Crunch', 'Core', MET.calisthenics),
  reps('Hanging Leg Raises', 'Core', MET.calisthenics),
  reps('Roman Chair Leg Raises', 'Core', MET.calisthenics),
  reps('Russian Twists', 'Core', MET.calisthenics),
  reps('Weighted Russian Twists', 'Core', MET.calisthenics),
  reps('Ab Wheel Rollout', 'Core', MET.calisthenics),
  reps('Farmer’s Walk', 'Core', MET.heavy),
  reps('Heavy Farmer’s Carry', 'Core', MET.heavy),
  timed('Plank', 'Core', MET.calisthenics),
  timed('Side Plank', 'Core', MET.calisthenics),
  timed('Wall Sit', 'Legs', MET.calisthenics),
  timed('Single Leg Balance Hold', 'Core', MET.stretch),

  // Cardio (MET for moderate pace: walking 3.5 mph, running 6 mph, etc.)
  timed('Walk', 'Cardio', 3.5),
  timed('Treadmill', 'Cardio', 4.3),
  timed('Incline Treadmill', 'Cardio', 5.3),
  timed('Run', 'Cardio', 9.8),
  timed('Cycling', 'Cardio', 6.8),
  timed('Stationary Bike', 'Cardio', 6.8),
  timed('Elliptical', 'Cardio', 5.0),
  timed('Rowing Machine', 'Cardio', 7.0),
  timed('Stair Climber', 'Cardio', 9.0),
  timed('Jump Rope', 'Cardio', 11.8),
  timed('Cardio Finisher (Treadmill/Cycle)', 'Cardio', 6.8),
  timed('Cardio Finisher (Elliptical)', 'Cardio', 5.0),
]

// Letters and digits only, lowercased, so "Push-Ups", "Pushups" and
// "Farmer's Walk" / "Farmer’s Walk" all compare equal.
function key(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const byKey = new Map(EXERCISE_CATALOG.map((entry) => [key(entry.name), entry]))

// Exact match (after normalizing punctuation/case) - used to prefill the add
// form, so a qualifier like "(burnout)" makes it a new exercise.
export function findCatalogExercise(name) {
  return byKey.get(key(name ?? '')) ?? null
}

// Looser match for MET only: also tries the name with a trailing "(...)" or
// "[...]" qualifier removed, so "Hack Squat (lighter, higher reps)" and
// "Lat Pulldown [Wide]" still get their base exercise's MET.
export function catalogMetFor(name) {
  const exact = findCatalogExercise(name)
  if (exact) return exact.met
  const base = (name ?? '').replace(/\s*[([][^)\]]*[)\]]\s*$/, '')
  return base !== name ? (findCatalogExercise(base)?.met ?? null) : null
}
