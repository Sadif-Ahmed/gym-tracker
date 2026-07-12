// One-off admin tool: creates (or reuses) a user account, auto-approves it,
// and seeds it with a plan from the library — bypassing the normal signup +
// manual dashboard approval flow via the service_role key.
//
// Usage:
//   node --env-file=.env.service.local scripts/seedAccount.mjs <email> <password> [planId]
//
// planId defaults to 'recomp-ppl-6day'. See src/data/planLibrary.js for options.

import { createClient } from '@supabase/supabase-js'
import { PLAN_LIBRARY } from '../src/data/planLibrary.js'

const [, , email, password, planId = 'recomp-ppl-6day'] = process.argv

if (!email || !password) {
  console.error('Usage: node --env-file=.env.service.local scripts/seedAccount.mjs <email> <password> [planId]')
  process.exit(1)
}

const plan = PLAN_LIBRARY.find((p) => p.id === planId)
if (!plan) {
  console.error(`Unknown planId "${planId}". Options: ${PLAN_LIBRARY.map((p) => p.id).join(', ')}`)
  process.exit(1)
}

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — run with --env-file=.env.service.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function getOrCreateUser() {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (!createError) return created.user

  if (createError.code !== 'email_exists') throw createError

  console.log(`User already exists, reusing: ${createError.message}`)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', email)
    .single()
  if (profileError) throw profileError
  return { id: profile.user_id }
}

async function main() {
  const user = await getOrCreateUser()
  console.log(`User id: ${user.id}`)

  const { error: approveError } = await supabase
    .from('profiles')
    .update({ approved: true })
    .eq('user_id', user.id)
  if (approveError) throw approveError
  console.log('Approved.')

  const { data: existingDays, error: listError } = await supabase
    .from('split_days')
    .select('id')
    .eq('user_id', user.id)
  if (listError) throw listError

  if (existingDays.length > 0) {
    console.log(`User already has ${existingDays.length} split day(s) — skipping seed to avoid duplicates.`)
    return
  }

  for (let i = 0; i < plan.days.length; i++) {
    const day = plan.days[i]
    const { data: splitDay, error: dayError } = await supabase
      .from('split_days')
      .insert({ user_id: user.id, name: day.name, sort_order: i })
      .select()
      .single()
    if (dayError) throw dayError

    const rows = day.exercises.map((exercise, j) => ({
      user_id: user.id,
      split_day_id: splitDay.id,
      name: exercise.name,
      muscle_group: exercise.muscleGroup,
      default_sets: exercise.defaultSets ?? null,
      default_rep_range: exercise.defaultRepRange ?? null,
      is_cardio: exercise.isCardio ?? false,
      no_metrics: exercise.noMetrics ?? false,
      sort_order: j,
    }))
    const { error: exError } = await supabase.from('exercises').insert(rows)
    if (exError) throw exError

    console.log(`  Day ${i + 1}: ${day.name} (${rows.length} exercises)`)
  }

  console.log(`Seeded "${plan.name}" — ${plan.days.length} split days.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
