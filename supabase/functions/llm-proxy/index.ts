import { createClient } from 'npm:@supabase/supabase-js@2'

// Cheap insurance against a runaway bug (e.g. a client retry loop)
// burning the LLM budget unattended — not about distrust, see Section 9
// of the architecture plan.
const DAILY_CALL_CAP = 15

// Tried in order; the next model is attempted if one fails or is too slow.
// Supabase Edge Functions have a hard ~150s execution ceiling, so these are
// deliberately small/fast models, not the biggest ones available - a large
// dense/MoE model (e.g. a ~400B one) can easily eat the entire budget on a
// single attempt with nothing left over for a fallback.
//
// Each entry here was hand-verified against this NVIDIA account to actually
// (a) be invokable at all - several catalog-listed vision models 404'd or
// came back "DEGRADED" for this key despite being listed - and (b) honor
// response_format json_schema rather than silently ignoring it and
// returning prose (meta/llama-3.2-11b-vision-instruct does this; dropped).
const VISION_MODEL_POOL = ['nvidia/nemotron-nano-12b-v2-vl', 'meta/llama-3.2-90b-vision-instruct']

const TEXT_MODEL_POOL = ['meta/llama-3.1-8b-instruct', 'meta/llama-3.1-70b-instruct']

// Per-attempt ceiling so one slow/unavailable model fails fast and leaves
// time for the next one in the pool, rather than exhausting the whole
// platform execution budget on a single try.
const PER_MODEL_TIMEOUT_MS = 30_000

const FOOD_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    calories: { type: 'integer' },
    protein_g: { type: 'number' },
    carbs_g: { type: 'number' },
    fat_g: { type: 'number' },
  },
  required: ['name', 'calories', 'protein_g', 'carbs_g', 'fat_g'],
}

const EXERCISE_SCHEMA = {
  type: 'object',
  properties: {
    estimated_calories: { type: 'integer' },
  },
  required: ['estimated_calories'],
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function callNvidiaOnce(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string | undefined,
  schema: object
) {
  const content: Record<string, unknown>[] = [{ type: 'text', text: userPrompt }]
  if (imageBase64) {
    content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } })
  }

  const requestBody = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content },
    ],
    temperature: 0.1,
    max_tokens: 1024,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'estimate', strict: true, schema },
    },
  }

  const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(PER_MODEL_TIMEOUT_MS),
  })

  if (!resp.ok) {
    throw new Error(`NVIDIA API error ${resp.status}: ${await resp.text()}`)
  }

  const responseJson = await resp.json()
  const rawContent = responseJson.choices?.[0]?.message?.content
  if (!rawContent) throw new Error('Empty response from model')

  let cleaned = rawContent.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  return JSON.parse(cleaned)
}

async function callNvidiaWithFallback(
  apiKey: string,
  modelPool: string[],
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string | undefined,
  schema: object
) {
  let lastError: Error | null = null
  for (const model of modelPool) {
    try {
      return await callNvidiaOnce(apiKey, model, systemPrompt, userPrompt, imageBase64, schema)
    } catch (err) {
      lastError = err as Error
      continue
    }
  }
  throw lastError ?? new Error('All models failed')
}

async function estimateFoodPhoto(apiKey: string, imageBase64: string | undefined) {
  if (!imageBase64) throw new Error('imageBase64 is required')
  const system =
    'You are a nutrition estimation assistant. Look at the photo of food and estimate its name and nutritional content as a single serving. Be realistic, not overly precise - round to sensible values. Respond only with the requested JSON.'
  const user = 'Estimate the calories and macros (protein, carbs, fat in grams) for the food shown in this photo.'
  return callNvidiaWithFallback(apiKey, VISION_MODEL_POOL, system, user, imageBase64, FOOD_SCHEMA)
}

async function estimateExerciseBurn(
  apiKey: string,
  body: { splitDayName?: string; exerciseSummaries?: string; durationMinutes?: number }
) {
  const { splitDayName, exerciseSummaries, durationMinutes } = body
  if (!exerciseSummaries) throw new Error('exerciseSummaries is required')
  const system =
    'You are a fitness calorie-burn estimation assistant. Given a summary of a strength/cardio workout session, estimate total calories burned for an average adult. Be realistic. Respond only with the requested JSON.'
  const user = `Workout: ${splitDayName ?? 'unspecified'}. Duration: ${
    durationMinutes ?? 'unknown'
  } minutes. Exercises performed: ${exerciseSummaries}. Estimate total calories burned during this session.`
  return callNvidiaWithFallback(apiKey, TEXT_MODEL_POOL, system, user, undefined, EXERCISE_SCHEMA)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // --- auth check first, every Edge Function starts here (standing rule) ---
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData?.user) {
    return json({ error: 'Unauthorized' }, 401)
  }
  const userId = userData.user.id

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // approval gate applies here too - not just the client UI
  const { data: profile } = await adminClient
    .from('profiles')
    .select('approved')
    .eq('user_id', userId)
    .maybeSingle()
  if (!profile?.approved) {
    return json({ error: 'Account not approved' }, 403)
  }

  // --- daily cap check, before spending anything on a real LLM call ---
  const { data: usageRow } = await adminClient
    .from('llm_usage')
    .select('call_count')
    .eq('user_id', userId)
    .eq('date', new Date().toISOString().slice(0, 10))
    .maybeSingle()

  if ((usageRow?.call_count ?? 0) >= DAILY_CALL_CAP) {
    return json({ error: 'Daily LLM call limit reached. Try again tomorrow.' }, 429)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const nvidiaApiKey = Deno.env.get('NVIDIA_API_KEY')!

  try {
    let result: unknown
    if (body.action === 'estimate_food_photo') {
      result = await estimateFoodPhoto(nvidiaApiKey, body.imageBase64 as string | undefined)
    } else if (body.action === 'estimate_exercise_burn') {
      result = await estimateExerciseBurn(nvidiaApiKey, body as never)
    } else {
      return json({ error: 'Unknown action' }, 400)
    }

    await adminClient.rpc('increment_llm_usage', { p_user_id: userId })
    return json(result, 200)
  } catch (err) {
    await adminClient.rpc('increment_llm_usage', { p_user_id: userId })
    return json({ error: `LLM estimation failed: ${(err as Error).message}` }, 502)
  }
})
