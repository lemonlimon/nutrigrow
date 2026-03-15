// POST /api/food-log/analyze
// Calls Claude to analyze a food photo and returns the result JSON.
// Does NOT save to the database — that happens in /api/food-log/confirm.

import { NextResponse }      from 'next/server'
import Anthropic             from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

const MODEL = 'claude-sonnet-4-6'

const GULF_DISHES = [
  'Kabsa', 'Mandi', 'Harees', 'Shawarma', 'Mutabbaq',
  'Madfoon', 'Jareesh', 'Saleeg',
]

function buildSystemPrompt(foodNameHint: string | null): string {
  const base = `You are a nutrition assistant for a Gulf-region health app. Analyze the food photo and respond with a JSON object only — no markdown, no extra text.

Common Gulf dishes to recognize: ${GULF_DISHES.join(', ')}, and other regional foods.
If you are uncertain about any food identification, note it clearly rather than guessing.

Respond with this exact structure:
{
  "dish_name": "name in English",
  "calories_estimate_low": 400,
  "calories_estimate_high": 600,
  "protein_g": 25,
  "carbs_g": 60,
  "fat_g": 15,
  "tag": "red" | "yellow" | "green",
  "note_en": "one sentence about this food nutritional profile",
  "note_ar": "one sentence in Arabic about this food nutritional profile"
}

Tag rules:
- green: high protein, vegetables, balanced portions, grilled or steamed
- yellow: moderate portions, mixed nutritional value, occasional treats
- red: high calorie density, large portions, fried or heavily processed

Calorie rules:
- Estimate calories as a realistic range for a typical Gulf serving size
- calories_estimate_low and calories_estimate_high must be whole numbers
- The range should reflect genuine uncertainty (e.g. 500–700, not 600–601)
- protein_g, carbs_g, fat_g should be whole numbers representing grams

Tone: warm, direct, factual. No exclamation points.`

  if (!foodNameHint) return base

  return base + `\n\nThe patient has identified this food as: "${foodNameHint}". Cross-check this with the photo. If they match, use the patient's name as the dish name. If they clearly don't match, use what you see in the photo and note the discrepancy in note_en.`
}

const MOCK_RESPONSE = {
  dish_name:              'Kabsa',
  calories_estimate_low:  550,
  calories_estimate_high: 750,
  protein_g:              28,
  carbs_g:                72,
  fat_g:                  18,
  tag:                    'yellow' as const,
  note_en:                'Good choice — consider a smaller rice portion and more salad on the side.',
  note_ar:                'خيار جيد — يُنصح بتقليل كمية الأرز وإضافة سلطة جانبية.',
}

interface FoodAnalysis {
  dish_name:              string
  calories_estimate_low:  number
  calories_estimate_high: number
  protein_g:              number
  carbs_g:                number
  fat_g:                  number
  tag:                    'red' | 'yellow' | 'green'
  note_en:                string
  note_ar:                string
}

function sanitizeFoodNameHint(raw: string): string | null {
  const cleaned = raw
    .replace(/<[^>]*>/g, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[^a-zA-Z0-9\s\-''\u0600-\u06FF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
  return cleaned.length > 0 ? cleaned : null
}

export async function POST(request: Request) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid form data' }, { status: 400 })
  }

  const imageFile = formData.get('image')     as File   | null
  const patientId = formData.get('patientId') as string | null

  if (!imageFile || !patientId) {
    return NextResponse.json(
      { success: false, error: 'Missing image or patientId' },
      { status: 400 }
    )
  }

  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_PATTERN.test(patientId)) {
    return NextResponse.json({ success: false, error: 'Invalid patientId' }, { status: 400 })
  }

  const rawFoodNameHint = formData.get('foodNameHint') as string | null
  const foodNameHint    = rawFoodNameHint ? sanitizeFoodNameHint(rawFoodNameHint) : null

  // Rate limiting: check confirmed meals in last 24h to prevent Claude API abuse
  const admin    = createAdminClient()
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: logCount } = await admin
    .from('food_logs')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', patientId)
    .gte('logged_at', since24h)

  if ((logCount ?? 0) >= 10) {
    return NextResponse.json(
      { success: false, error: 'Daily limit reached. You can log up to 10 meals per day.' },
      { status: 429 }
    )
  }

  // ── AI analysis ───────────────────────────────────────────────────────────
  let analysis: FoodAnalysis

  if (process.env.USE_MOCK_AI === 'true') {
    analysis = MOCK_RESPONSE
  } else {
    const arrayBuffer = await imageFile.arrayBuffer()
    const base64      = Buffer.from(arrayBuffer).toString('base64')
    const mediaType   = (imageFile.type || 'image/jpeg') as
      'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    try {
      const anthropic    = new Anthropic()
      const systemPrompt = buildSystemPrompt(foodNameHint)
      const message      = await anthropic.messages.create({
        model:      MODEL,
        max_tokens: 512,
        messages: [{
          role:    'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text',  text: systemPrompt },
          ],
        }],
      })

      const raw  = message.content[0].type === 'text' ? message.content[0].text : ''
      const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      analysis   = JSON.parse(json) as FoodAnalysis
    } catch (err) {
      console.error('[food-log/analyze] Claude call failed:', err)
      return NextResponse.json(
        { success: false, error: 'Food analysis failed. Please try again.' },
        { status: 500 }
      )
    }
  }

  if (!['red', 'yellow', 'green'].includes(analysis.tag)) {
    analysis = { ...analysis, tag: 'yellow' }
  }

  return NextResponse.json({ success: true, data: analysis })
}
