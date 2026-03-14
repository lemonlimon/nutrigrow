// Daily Tip API — GET: check cache, generate if missing, upsert, return tip
// Model: claude-haiku-4-5-20251001 (fast + cheap for simple generation)
// Cache key: (patient_id, tip_date) UNIQUE — one tip per patient per day

import { NextResponse } from 'next/server'
import Anthropic        from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

const MODEL     = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 150

// Fallback tip used in mock mode or if AI call fails
const FALLBACK_TIP = {
  tip_en: 'Focus on portion control today — try using a smaller plate and eating slowly to give your body time to signal fullness.',
  tip_ar: 'ركّز على حجم الوجبة اليوم — جرّب استخدام طبق أصغر وتناول طعامك ببطء حتى يتمكن جسمك من الشعور بالشبع.',
}

function buildTipPrompt(context: {
  recentFoods:    { dish_name: string; tag: string; meal_type: string | null }[]
  recentContexts: string[]
  weightTrend:    'up' | 'down' | 'flat' | 'no_data'
  streak:         number
}): string {
  const { recentFoods, recentContexts, weightTrend, streak } = context

  const foodSummary = recentFoods.length > 0
    ? recentFoods.map(f => `${f.dish_name} (${f.tag}${f.meal_type ? `, ${f.meal_type}` : ''})`).join(', ')
    : 'no recent food logged'

  const ctxSummary = recentContexts.length > 0
    ? Array.from(new Set(recentContexts)).join(', ')
    : 'no context logged'

  return `You are a warm, supportive nutritionist for a Gulf-region weight management app. Generate a short daily insight for this patient.

Patient context:
- Recent meals: ${foodSummary}
- Life context this week: ${ctxSummary}
- Weight trend: ${weightTrend}
- Current streak: ${streak} day${streak !== 1 ? 's' : ''}

Generate ONE practical, empathetic tip based on the most relevant behavioral signal:
- family_gathering: tips for eating well at social occasions
- stressed: gentle encouragement, stress-eating awareness
- ramadan: fasting-friendly nutrition advice
- red tag foods: suggest healthier alternatives
- weight trending up: gentle course-correction
- streak ≥ 5: positive reinforcement
- default: balanced, general encouragement

Respond with ONLY a JSON object, no markdown:
{
  "tip_en": "one warm practical sentence in English (max 25 words)",
  "tip_ar": "نفس النصيحة بالعربية"
}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get('patientId')
  const tipDate   = searchParams.get('date')   // "YYYY-MM-DD"

  if (!patientId || !tipDate) {
    return NextResponse.json({ success: false, error: 'Missing patientId or date' }, { status: 400 })
  }

  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_PATTERN.test(patientId)) {
    return NextResponse.json({ success: false, error: 'Invalid patientId' }, { status: 400 })
  }

  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
  if (!DATE_PATTERN.test(tipDate)) {
    return NextResponse.json({ success: false, error: 'Invalid date format' }, { status: 400 })
  }

  const admin = createAdminClient()

  // ── Check cache first ──────────────────────────────────────────────────────
  const { data: cached } = await admin
    .from('daily_tips')
    .select('tip_en, tip_ar')
    .eq('patient_id', patientId)
    .eq('tip_date', tipDate)
    .maybeSingle()

  if (cached) {
    return NextResponse.json({ success: true, data: cached })
  }

  // ── Mock mode — return fallback without calling AI ────────────────────────
  if (process.env.USE_MOCK_AI === 'true') {
    return NextResponse.json({ success: true, data: FALLBACK_TIP })
  }

  // ── Build context for prompt ───────────────────────────────────────────────
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoISO = sevenDaysAgo.toISOString()

  const streakStart = new Date()
  streakStart.setDate(streakStart.getDate() - 30)
  const streakStartISO = streakStart.toISOString()

  const [
    { data: recentFoods },
    { data: recentContexts },
    { data: recentWeights },
    { data: streakWeights },
    { data: streakFoods },
    { data: streakCtxs },
  ] = await Promise.all([
    admin.from('food_logs')
      .select('dish_name, tag, meal_type')
      .eq('patient_id', patientId)
      .order('logged_at', { ascending: false })
      .limit(3),
    admin.from('context_logs')
      .select('context')
      .eq('patient_id', patientId)
      .gte('logged_at', sevenDaysAgoISO)
      .order('logged_at', { ascending: false }),
    admin.from('weight_logs')
      .select('weight_kg')
      .eq('patient_id', patientId)
      .order('logged_at', { ascending: false })
      .limit(3),
    admin.from('weight_logs')
      .select('logged_at')
      .eq('patient_id', patientId)
      .gte('logged_at', streakStartISO),
    admin.from('food_logs')
      .select('logged_at')
      .eq('patient_id', patientId)
      .gte('logged_at', streakStartISO),
    admin.from('context_logs')
      .select('logged_at')
      .eq('patient_id', patientId)
      .gte('logged_at', streakStartISO),
  ])

  // Weight trend from last 3 entries
  const weights  = recentWeights ?? []
  let weightTrend: 'up' | 'down' | 'flat' | 'no_data' = 'no_data'
  if (weights.length >= 2) {
    const delta = weights[0].weight_kg - weights[weights.length - 1].weight_kg
    weightTrend = delta < -0.1 ? 'down' : delta > 0.1 ? 'up' : 'flat'
  }

  // Streak calculation
  const allDates = [
    ...(streakWeights ?? []),
    ...(streakFoods   ?? []),
    ...(streakCtxs    ?? []),
  ].map(l => l.logged_at)
  const dateSet  = new Set(allDates.map((d: string) => d.slice(0, 10)))
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d   = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (dateSet.has(key)) { streak++ } else { break }
  }

  const promptContext = {
    recentFoods:    (recentFoods ?? []) as { dish_name: string; tag: string; meal_type: string | null }[],
    recentContexts: (recentContexts ?? []).map(c => c.context),
    weightTrend,
    streak,
  }

  // ── Call Haiku ─────────────────────────────────────────────────────────────
  let tip: { tip_en: string; tip_ar: string }

  try {
    const anthropic = new Anthropic()
    const message   = await anthropic.messages.create({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{
        role:    'user',
        content: buildTipPrompt(promptContext),
      }],
    })

    const raw  = message.content[0].type === 'text' ? message.content[0].text : ''
    const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(json) as { tip_en: string; tip_ar: string }

    if (!parsed.tip_en || !parsed.tip_ar) throw new Error('Incomplete tip fields')
    tip = parsed
  } catch (err) {
    console.error('[daily-tip] Haiku call failed:', err)
    tip = FALLBACK_TIP
  }

  // ── Upsert to cache (ignore conflict — idempotent) ─────────────────────────
  await admin.from('daily_tips').upsert(
    {
      patient_id: patientId,
      tip_date:   tipDate,
      tip_en:     tip.tip_en,
      tip_ar:     tip.tip_ar,
    },
    { onConflict: 'patient_id,tip_date' }
  )

  return NextResponse.json({ success: true, data: tip })
}
