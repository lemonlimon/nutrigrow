// POST /api/food-log/confirm
// Receives a pre-analyzed food result and saves it to the database.
// Called after the patient confirms the AI analysis is correct.

import { NextResponse }      from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

// Score ranges by tag — randomised per confirm so every meal feels distinct
const SCORE_RANGES: Record<string, [number, number]> = {
  green:  [8, 9],
  yellow: [5, 7],
  red:    [2, 4],
}
function computeMealScore(tag: string): number {
  const [min, max] = SCORE_RANGES[tag] ?? [5, 7]
  return min + Math.floor(Math.random() * (max - min + 1))
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

export async function POST(request: Request) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { patientId?: unknown; analysis?: unknown; mealType?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { patientId, analysis, mealType: rawMealType } = body

  // Validate patientId
  if (typeof patientId !== 'string') {
    return NextResponse.json({ success: false, error: 'Missing patientId' }, { status: 400 })
  }
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_PATTERN.test(patientId)) {
    return NextResponse.json({ success: false, error: 'Invalid patientId' }, { status: 400 })
  }

  // Validate analysis shape
  if (!analysis || typeof analysis !== 'object') {
    return NextResponse.json({ success: false, error: 'Missing analysis' }, { status: 400 })
  }
  const a = analysis as Partial<FoodAnalysis>
  if (
    typeof a.dish_name              !== 'string'  ||
    typeof a.calories_estimate_low  !== 'number'  ||
    typeof a.calories_estimate_high !== 'number'  ||
    typeof a.protein_g              !== 'number'  ||
    typeof a.carbs_g                !== 'number'  ||
    typeof a.fat_g                  !== 'number'  ||
    !['red', 'yellow', 'green'].includes(a.tag ?? '')
  ) {
    return NextResponse.json({ success: false, error: 'Invalid analysis payload' }, { status: 400 })
  }

  const safeAnalysis = a as FoodAnalysis
  const mealType     = (typeof rawMealType === 'string' && VALID_MEAL_TYPES.includes(rawMealType))
    ? rawMealType
    : null
  const mealScore    = computeMealScore(safeAnalysis.tag)

  // Rate limiting: max 10 confirmed meals per patient per 24h
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

  const { error: insertError } = await admin.from('food_logs').insert({
    patient_id:             patientId,
    dish_name:              safeAnalysis.dish_name,
    calories_estimate_low:  safeAnalysis.calories_estimate_low,
    calories_estimate_high: safeAnalysis.calories_estimate_high,
    protein_g:              safeAnalysis.protein_g,
    carbs_g:                safeAnalysis.carbs_g,
    fat_g:                  safeAnalysis.fat_g,
    tag:                    safeAnalysis.tag,
    note_en:                safeAnalysis.note_en,
    note_ar:                safeAnalysis.note_ar,
    meal_type:              mealType,
    meal_score:             mealScore,
  })

  if (insertError) {
    console.error('[food-log/confirm] insert failed:', insertError)
    return NextResponse.json(
      { success: false, error: 'Could not save food log. Please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data: { meal_score: mealScore } })
}
