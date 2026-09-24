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

// YouTube form tutorial per catalog exercise (video id). Each was picked from
// a YouTube search, confirmed public and embeddable via oEmbed, and checked by
// title against the exercise (Sep 2026) - see the Exercise Tutorials report.
const TUTORIAL_IDS = {
  'Jumping Jacks (1 min)': 'XR0xeuK5zBU', // P4P WORKOUTS 
  'Torso Twists (10 each side)': 'f4Qah0bQTIo', // Leap Fitness
  'Ankle Rotations (10 each side)': 'hiX2GaXOok8', // TurnFit - Vancouver Personal Trainers
  'Arm Circles Fwd/Back (20 sec each direction)': 'iiOu4hwkuj0', // Fit to Create
  'Shoulder Pass-Throughs (10 reps)': 'DzNCBJuhq10', // Dr. Carl Baird
  'Doorway/Wall Chest Stretch (20 sec each side)': 'CEQMx4zFwYs', // MidwestOrtho
  'Push-Up to Downward Dog (8 reps)': 'SYKJ7LgseyQ', // Get Strong with Emily
  'Scapular Push-Ups (10 reps)': 'fLAf2YG4flw', // Precision Movement
  'Cat-Cow Stretch (10 reps)': 'kqnua4rHVVA', // Howcast
  'Overhead Side-Bend Lat Stretch (20 sec each side)': 'Vko-SJok-fk', // Cleveland Clinic
  'Band Pull-Aparts (15 reps)': '3OYSIWaJJk4', // Men's Health
  'Thoracic Spine Rotations (8 reps each side)': 'hhvHpsxKjXw', // E3 Rehab
  'Wrist/Forearm Circles (10 each direction)': 't4nXywRlQ18', // Yoga on the Move
  'Hip Circles (10 each direction)': 'xeKrkF7f2iQ', // Women 3D Workouts
  'Leg Swings Front-Back & Side-Side (10 each leg)': 'naW8u72lOzI', // 3v
  'Bodyweight Squats (15 reps)': 'P-yaD24bUE8', // Runna
  'Walking Lunges (10 each leg)': 'Lo4cCQ2HfzA', // Advanced Therapy and Performance
  'Glute Bridges (15 reps)': 'wPM8icPu6H8', // Well+Good
  'Bench Press': '4Y2ZdHCOXok', // Jeremy Ethier
  'Flat Barbell Bench Press Station': 'rT7DgCr-3pg', // ScottHermanFitness
  'Incline Barbell Bench Press': 'SrqOu55lrYU', // ScottHermanFitness
  'Decline Bench Press': 'LfyQBUKR8SE', // ScottHermanFitness
  'Dumbbell Bench Press': 'Y_7aHqXeCfQ', // ScottHermanFitness
  'Incline Dumbbell Press': '8iPEnn-ltC8', // ScottHermanFitness
  'Smith Machine Flat/Incline Press': 'z_r6hDOYtO0', // ScottHermanFitness
  'Chest Press Machine': 'xUm0BiZCWlQ', // ScottHermanFitness
  'Pec Deck Fly': 'H4mVGHaK2f4', // Colossus Fitness
  'Incline Pec Fly': 'idAvu2HvqSQ', // ScottHermanFitness
  'Dumbbell Fly': 'eozdVDA78K0', // ScottHermanFitness
  'Cable Crossover Machine': 'taI4XduLpTk', // LIVESTRONG
  'Cable Crossover Machine (chest fly)': 'taI4XduLpTk', // LIVESTRONG
  'Push-Ups': 'IODxDxX7oi4', // Calisthenicmovement
  'Deadlift': 'r4MzxtBKyNE', // Men's Health
  'Pull-Up': 'eGo4IYlbE5g', // Calisthenicmovement
  'Chin-Up': 'mRy9m2Q9_1I', // KILO Personal Trainer & Strength Coach Education
  'Lat Pulldown': 'CAwf7n6Luuc', // ScottHermanFitness
  'Lat Pulldown Machine': 'CAwf7n6Luuc', // ScottHermanFitness
  'Lat Pulldown (wide grip)': 'CAwf7n6Luuc', // ScottHermanFitness
  'Barbell Row': 'kBWAon7ItDw', // Jeremy Ethier
  'T-Bar Row': 'j3Igk5nyZE4', // ScottHermanFitness
  'T-Bar Row (lighter, higher reps)': 'j3Igk5nyZE4', // ScottHermanFitness
  'Dumbbell Row': 'roCP6wCXPqo', // Men's Health
  'Seated Cable Row': 'sP_4vybjVJs', // Mind Pump TV
  'Seated Cable Row (close grip)': 'GZbfZ033f74', // ScottHermanFitness
  'Low Row': 'GZbfZ033f74', // ScottHermanFitness
  'Longpull': 'GZbfZ033f74', // ScottHermanFitness
  'Back Extension': 'H8Swl1N-uis', // Squat University
  'Shrugs': 'cJRVVxmytaM', // ScottHermanFitness
  'Overhead Press': '2yjwXTZQDDI', // ScottHermanFitness
  'Seated Shoulder Press': 'qEwKCR5JCog', // ScottHermanFitness
  'Dumbbell Shoulder Press': 'qEwKCR5JCog', // ScottHermanFitness
  'Arnold Press': '6Z15_WdXmVw', // Buff Dudes
  'Lateral Raise': 'pgrWjBfaFe8', // Colossus Fitness
  'Standing Lateral Raise': 'pgrWjBfaFe8', // Colossus Fitness
  'Standing Lateral Raise Machine': 'NNAs8jx_zJI', // Colossus Fitness
  'Front Raise': '-t7fuZ0KhDA', // ScottHermanFitness
  'Face Pull': 'ljgqer1ZpXg', // ATHLEAN-X™
  'Rear Delt/Pec Fly': 'dC7jhEk-29A', // Colossus Fitness
  'Rear Delt/Pec Fly (reverse)': 'dC7jhEk-29A', // Colossus Fitness
  'Upright Row': 'jaAV-rD45I0', // Buff Dudes
  'Barbell Curl': 'kwG2ipFRgfo', // Howcast
  'EZ Curl Bar Bicep Curl': 'zG2xJ0Q5QtI', // ScottHermanFitness
  'Dumbbell Curl': 'ykJmrZ5v0Oo', // Howcast
  'Hammer Curl': 'zC3nLlEvin4', // ScottHermanFitness
  'Cable Curl': 'AsAVbj7puKo', // ScottHermanFitness
  'Preacher Curl Machine': 'AR-oARBkYxI', // Colossus Fitness
  'Preacher Curl Machine (burnout)': 'AR-oARBkYxI', // Colossus Fitness
  'Triceps Pushdown': '_w-HpW70nSQ', // ScottHermanFitness
  'Triceps Pushdown (Dual Cable Cross)': '_w-HpW70nSQ', // ScottHermanFitness
  'Triceps Rope Pushdown': 'vB5OHsJ3EME', // ScottHermanFitness
  'EZ Curl Bar Skull Crushers': 'd_KZxkY_0cM', // ScottHermanFitness
  'Overhead Triceps Extension': '-Vyt2QdsR7E', // ScottHermanFitness
  'Triceps Kickback (Functional Trainer)': 'm9me06UBPKc', // Buff Dudes
  'Close-Grip Bench Press': 'nEF0bv2FW94', // ScottHermanFitness
  'Power Tower Dips': 'vi1-BOcj3cQ', // ATHLEAN-X™
  'Squat': 'gcNh17Ckjgg', // Jeremy Ethier
  'Front Squat': 'v-mQm_droHg', // Jeff Nippard
  'Hack Squat': '0tn5K9NlCfo', // Bodybuilding.com
  'Hack Squat Machine': '0tn5K9NlCfo', // Bodybuilding.com
  'Hack Squat (lighter, higher reps)': '0tn5K9NlCfo', // Bodybuilding.com
  'Leverage Squat': 'G_wrc8Suow0', // Prep Coach UK
  'Leg Press': 'K5n2vg3oZa4', // Colossus Fitness
  'Bulgarian Split Squat': 'hiLF_pF3EJM', // ATHLEAN-X™
  'Dumbbell Lunges': 'qQyCK_rxzN0', // Fit Father Project - Fitness For Busy Fathers
  'Romanian Deadlift': '_oyxCn2iSjU', // Jeff Nippard
  'Romanian Deadlift (dumbbells)': '_oyxCn2iSjU', // Jeff Nippard
  'Hip Thrust': 'SEdqd1n0cvg', // ScottHermanFitness
  'Glute Bridges': 'wPM8icPu6H8', // Well+Good
  'Weighted Step Ups': 'aKj-6hgiViA', // Colossus Fitness
  'Plyo Box Step-ups': 'vs87hPGdnCc', // Fit Father Project - Fitness For Busy Fathers
  'Eccentric Step Downs': 'Or4C-UQ63Xc', // Dr. Carl Baird
  'Leg Curl': 'jxctD6fL_FQ', // Bodybuilding.com
  'Leg Extension': 'YyvSfVjQeL0', // ScottHermanFitness
  'Standing Calf Raise': 'SVtg-1loH4c', // Colossus Fitness
  'Seated Calf Raise': '6O5hh1rBtx8', // Colossus Fitness
  'Crunches': '0t4t3IpiEao', // Well+Good
  'Decline Crunches': 'QhGU5cmNZds', // ScottHermanFitness
  'Abdominal Crunch Bench': 'NPttpwI1vdU', // WesternWeightRm
  'Abdominal Crunch Machine': 'fl9FSpCpvq0', // Colossus Fitness
  'Kneeling Cable Crunches': 'aBd6T01PBqw', // Colossus Fitness
  'Seated Leg Crunch': '54q250IUEAc', // LIVESTRONG
  'Hanging Leg Raises': 'Pr1ieGZ5atk', // ATHLEAN-X™
  'Roman Chair Leg Raises': 'otq7vj-Nb8k', // ActionJacksonFit
  'Russian Twists': 'wkD8rjkodUI', // Howcast
  'Weighted Russian Twists': 'wkD8rjkodUI', // Howcast
  'Ab Wheel Rollout': 'A3uK5TPzHq8', // ATHLEAN-X™
  'Farmer’s Walk': 'E94UNm8fD-4', // Colossus Fitness
  'Heavy Farmer’s Carry': 'z7E_YU9P1jU', // Dr. Carl Baird
  'Plank': 'pSHjTRCQxIw', // ScottHermanFitness
  'Side Plank': 'NXr4Fw8q60o', // Howcast
  'Wall Sit': 'y-wV4Venusw', // ScottHermanFitness
  'Single Leg Balance Hold': '7SF7AYh2_Yw', // Coury & Buehler Physical Therapy
  'Walk': 'JJIhSpGAElw', // Mr.Physio
  'Treadmill': '8i3Vrd95o2k', // Naomi Kong
  'Incline Treadmill': '9ccVxEvWtpA', // VIVEHealthandFitness
  'Run': '-AASu9CNFoM', // Progressive Soccer
  'Cycling': 'csNeUKYBW0E', // Studio SWEAT onDemand
  'Stationary Bike': 'csNeUKYBW0E', // Studio SWEAT onDemand
  'Elliptical': 'ibjvKk93__g', // Howcast
  'Rowing Machine': '4zWu1yuJ0_g', // concept2usa
  'Stair Climber': 'ww3YV_N6U_U', // McKinley Health Center
  'Jump Rope': 'u3zgHI8QnqE', // Well+Good
  'Cardio Finisher (Treadmill/Cycle)': 'ho1ZeTCHdLU', // IBX Running
  'Cardio Finisher (Elliptical)': 'ibjvKk93__g', // Howcast
}

// Letters and digits only, lowercased, so "Push-Ups", "Pushups" and
// "Farmer's Walk" / "Farmer’s Walk" all compare equal.
function key(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const byKey = new Map(EXERCISE_CATALOG.map((entry) => [key(entry.name), entry]))
const TUTORIAL_BY_KEY = new Map(Object.entries(TUTORIAL_IDS).map(([name, id]) => [key(name), id]))

// Exact match (after normalizing punctuation/case) - used to prefill the add
// form, so a qualifier like "(burnout)" makes it a new exercise.
export function findCatalogExercise(name) {
  return byKey.get(key(name ?? '')) ?? null
}

// Looser match: also tries the name with a trailing "(...)" or "[...]"
// qualifier removed, so "Hack Squat (lighter, higher reps)" and
// "Lat Pulldown [Wide]" still resolve to their base exercise.
function findBaseExercise(name) {
  const exact = findCatalogExercise(name)
  if (exact) return exact
  const base = (name ?? '').replace(/\s*[([][^)\]]*[)\]]\s*$/, '')
  return base !== name ? findCatalogExercise(base) : null
}

export function catalogMetFor(name) {
  return findBaseExercise(name)?.met ?? null
}

// YouTube video id of the exercise's form tutorial, or null.
export function tutorialFor(name) {
  const entry = findBaseExercise(name)
  return entry ? (TUTORIAL_BY_KEY.get(key(entry.name)) ?? null) : null
}
