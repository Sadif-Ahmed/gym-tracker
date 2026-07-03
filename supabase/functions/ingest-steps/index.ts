import { createClient } from 'npm:@supabase/supabase-js@2'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Called by each friend's own iOS Shortcut, not a signed-in browser
// session, so there's no Supabase JWT to check — verify_jwt is disabled
// for this function (see supabase/config.toml) and the per-user
// bridge_token stands in as the auth check instead. Standing rule is
// still "auth check first"; it just isn't a Supabase session here.
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return json({ error: 'Missing bridge token' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: profile } = await adminClient
    .from('profiles')
    .select('user_id, approved')
    .eq('bridge_token', token)
    .maybeSingle()

  if (!profile) {
    return json({ error: 'Invalid bridge token' }, 401)
  }
  if (!profile.approved) {
    return json({ error: 'Account not approved' }, 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const steps = Number(body.steps)
  if (!Number.isFinite(steps) || steps < 0) {
    return json({ error: 'steps must be a non-negative number' }, 400)
  }

  // The Shortcut should send the phone's own local date (matching how
  // the client computes "today" — see src/utils/dates.js); this server-side
  // UTC fallback only covers a caller that omits it, and can be off by a
  // day near midnight in non-UTC timezones.
  const date =
    typeof body.date === 'string' && DATE_RE.test(body.date)
      ? body.date
      : new Date().toISOString().slice(0, 10)

  const { data, error } = await adminClient
    .from('daily_steps')
    .upsert(
      { user_id: profile.user_id, date, steps: Math.round(steps), synced_at: new Date().toISOString() },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (error) {
    return json({ error: error.message }, 500)
  }

  return json({ ok: true, date: data.date, steps: data.steps }, 200)
})
