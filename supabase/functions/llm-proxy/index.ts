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

const MET_SCHEMA = {
  type: 'object',
  properties: {
    met_value: { type: 'number' },
  },
  required: ['met_value'],
}

// Browsers preflight any cross-origin request carrying an Authorization
// header, and Supabase's hosted Edge Function gateway (unlike the local
// dev one) doesn't add CORS headers for you - the function must handle
// OPTIONS and stamp these on every response itself, or the real request
// never gets sent. Wildcard origin is fine here since auth is a bearer
// token the caller sets explicitly, not an ambient cookie.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
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

// Classifies a single exercise's MET (Metabolic Equivalent of Task) value -
// the one fuzzy judgment call in calorie-burn math (see
// src/utils/calorieBurnCalculator.js). Called once per exercise ever; the
// caller persists the result to exercises.met_value so this never runs
// again for that exercise. The arithmetic itself (met * bodyweight * time)
// is deterministic client-side math, not an LLM call.
async function classifyExerciseMet(
  apiKey: string,
  body: { name?: string; muscleGroup?: string; isCardio?: boolean }
) {
  const { name, muscleGroup, isCardio } = body
  if (!name) throw new Error('name is required')
  const system =
    'You are an exercise physiology assistant. Given an exercise, classify its MET (Metabolic Equivalent of Task) value for a typical moderate-to-vigorous gym set at that exercise. Use standard MET compendium values as a reference. Respond only with the requested JSON.'
  const user = `Exercise: ${name}. Muscle group: ${muscleGroup ?? 'unspecified'}. Type: ${
    isCardio ? 'cardio' : 'strength/resistance'
  }. Give a realistic MET value for this exercise.`
  return callNvidiaWithFallback(apiKey, TEXT_MODEL_POOL, system, user, undefined, MET_SCHEMA)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
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
    } else if (body.action === 'classify_exercise_met') {
      result = await classifyExerciseMet(nvidiaApiKey, body as never)
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
