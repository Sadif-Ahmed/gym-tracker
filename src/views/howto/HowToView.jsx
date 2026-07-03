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
      "See today's calories against your daily target (from Goals), plus today's step count and an estimated calorie burn from walking, synced via the Steps Bridge in Settings.",
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
      'Pick a strength exercise to chart its estimated one-rep max over time, using your best set from each session.',
    ],
  },
  {
    title: 'Goals',
    body: [
      'Enter your age, height, weight, and activity level to get your BMR, TDEE, and daily calorie target.',
      'Log your weight here whenever you check it — Nutrition and Today both use your most recent entry for calorie-burn math.',
    ],
  },
  {
    title: 'Split Days',
    body: ['Manage your own training split: add, rename, or remove days, and the exercises inside each one.'],
  },
  {
    title: 'Settings',
    body: [
      'Set up the Steps Bridge: an iOS Shortcut that syncs your daily step count into the app automatically (roughly hourly is recommended).',
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
