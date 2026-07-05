import './howto.css'

const SECTIONS = [
  {
    title: 'Today',
    body: [
      "Pick a split day to start today's workout. Log each set as you go — weight × reps for strength exercises, minutes for cardio.",
      'Tap Finish when you\'re done, then "Estimate calories burned" for a MET-based estimate from your actual sets and bodyweight — review it and edit the number before saving.',
    ],
  },
  {
    title: 'Nutrition',
    body: [
      'Log food manually, or snap a photo for an AI estimate — always review the numbers before saving, since photo estimates are a starting point, not gospel.',
      'The Calories field is the total for that entry — the whole plate or serving, not per 100g. Whole numbers only. Protein/carbs/fat are optional and just for your own tracking; they don\'t affect the calorie target.',
      'Six numbers at the top of Nutrition each day: Target Calorie Consumption, Total Calories Consumed, Calories Burned (Exercise), Calories Burned (Steps), Actual Deficit, and Target Deficit — see Calorie Calculations below for what each one means and how it\'s worked out.',
    ],
  },
  {
    title: 'Calorie Calculations',
    body: [
      'BMR (Basal Metabolic Rate) — calories your body burns at rest, from age/height/weight/biological sex via the Mifflin-St Jeor formula.',
      'TDEE (Total Daily Energy Expenditure) = BMR × activity level (sedentary to very active) — an estimate of a typical day\'s burn for someone at that activity level.',
      'Target Calorie Consumption = TDEE − Target Deficit. This is how much you should eat today to lose weight at your chosen rate.',
      'Target Deficit = weekly loss rate (kg) × 7700 ÷ 7 — the daily shortfall needed for that rate (7700 calories ≈ 1kg of fat). Set the rate to 0 in Goals for a maintenance target (Target Deficit becomes 0).',
      'Calories Burned (Exercise) = MET value of each exercise × your bodyweight × time spent, from your logged sets — saved once you Finish a workout and confirm the estimate on Today.',
      'Calories Burned (Steps) = your logged step count converted to calories using a walking MET value, assuming a typical walking pace.',
      'Actual Deficit = TDEE + Calories Burned (Exercise) + Calories Burned (Steps) − Total Calories Consumed. This is your real energy balance for the day, using what you actually did and ate.',
      'Compare Actual Deficit to Target Deficit: equal or higher means you\'re on pace or ahead of your goal; lower (shown in red) means you\'ve eaten more than your activity today allows for, so you\'re behind pace.',
    ],
  },
  {
    title: 'History',
    body: [
      'Browse past workouts, tap one to expand its sets, and delete any single workout you logged by mistake.',
    ],
  },
  {
    title: 'Progress',
    body: [
      'Pick any exercise to chart it over time — estimated one-rep max from your best set each session for strength exercises, total minutes logged each session for cardio.',
    ],
  },
  {
    title: 'Goals',
    body: [
      'Enter your age, height, weight, and activity level to get your BMR, TDEE, and daily calorie target.',
      'Log your weight here whenever you check it — Nutrition and Today both use your most recent entry for calorie-burn math.',
      "Log today's step count here too, from your phone's own step counter — Nutrition uses it for an estimated walking calorie burn.",
    ],
  },
  {
    title: 'Split Days',
    body: ['Manage your own training split: add, rename, or remove days, and the exercises inside each one.'],
  },
  {
    title: 'Settings',
    body: [
      "The Danger Zone lets you permanently delete your own logged history by category — workouts, nutrition, weight, or steps — without touching your split days or goals.",
    ],
  },
]

export function HowToView() {
  return (
    <section class="howto-view">
      <h1>How to use WorkoutTracker</h1>
      <p class="howto-intro">A quick tour of each tab.</p>

      {SECTIONS.map((section) => (
        <section class="howto-card" key={section.title}>
          <h2>{section.title}</h2>
          {section.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </section>
      ))}
    </section>
  )
}
