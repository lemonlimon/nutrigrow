import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Unit conversion helpers ────────────────────────────────────────────────

const lbsToKg    = (lbs: number)                   => Math.round((lbs / 2.20462) * 10) / 10
const ftInToCm   = (ft: number, inch: number)       => Math.round((ft * 12 + inch) * 2.54)

// ── Request body type ──────────────────────────────────────────────────────

interface CompleteBody {
  mode:        'invited' | 'direct'
  patientId:   string | null
  clinicId:    string | null
  inviteToken: string | null

  gender:               string | null
  date_of_birth:        string | null
  unit:                 'imperial' | 'metric'
  height_ft:            number
  height_in:            number
  height_cm:            number
  current_weight:       number
  current_weight_unit:  'lbs' | 'kg'
  goal_type:            string | null
  workout_frequency:    string | null
  target_weight:        number | null
  weight_loss_speed:    number | null
  barriers:             string[]
  diet_type:            string | null
  wellness_goals:       string[]
  rollover_calories:    boolean | null
  add_exercise_calories:boolean | null
  referral_source:      string | null
}

export async function POST(request: Request) {
  // ── 1. Parse body ──────────────────────────────────────────────────────
  let body: CompleteBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // ── 2. Auth check ──────────────────────────────────────────────────────
  let supabase
  try {
    supabase = createClient()
  } catch (err) {
    console.error('[onboarding/complete] Failed to create server client:', err)
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 3. Unit conversion ────────────────────────────────────────────────
  let weightKg: number
  let heightCm: number
  let targetWeightKg: number | null

  if (body.unit === 'imperial') {
    weightKg      = lbsToKg(body.current_weight)
    heightCm      = ftInToCm(body.height_ft, body.height_in)
    targetWeightKg = body.target_weight !== null ? lbsToKg(body.target_weight) : null
  } else {
    weightKg      = body.current_weight
    heightCm      = body.height_cm
    targetWeightKg = body.target_weight ?? null
  }

  // ── 4. Admin client for DB writes (bypasses RLS) ──────────────────────
  let admin
  try {
    admin = createAdminClient()
  } catch (err) {
    console.error('[onboarding/complete] Failed to create admin client:', err)
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  let finalPatientId: string | null = body.patientId ?? null

  // ── 5a. MODE: invited ─────────────────────────────────────────────────
  if (body.mode === 'invited') {
    if (!body.patientId) {
      return NextResponse.json({ error: 'Missing patientId for invited mode' }, { status: 400 })
    }

    const { error: updateError } = await admin
      .from('patients')
      .update({
        user_id:               user.id,
        gender:                body.gender,
        date_of_birth:         body.date_of_birth,
        height_cm:             heightCm,
        weight_kg:             weightKg,
        goal_type:             body.goal_type,
        workout_frequency:     body.workout_frequency,
        target_weight:         targetWeightKg,
        weight_loss_speed:     body.weight_loss_speed,
        barriers:              body.barriers,
        diet_type:             body.diet_type,
        wellness_goals:        body.wellness_goals,
        rollover_calories:     body.rollover_calories,
        add_exercise_calories: body.add_exercise_calories,
        referral_source:       body.referral_source,
        invite_status:         'active',
        onboarding_complete:   true,
      })
      .eq('id', body.patientId)

    if (updateError) {
      console.error('[onboarding/complete] Failed to update patient:', updateError)
      return NextResponse.json({ error: 'Failed to save patient data' }, { status: 500 })
    }

    // Mark invite token as used
    if (body.inviteToken) {
      const { error: tokenError } = await admin
        .from('invite_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', body.inviteToken)

      if (tokenError) {
        // Non-fatal — log but don't fail the request
        console.error('[onboarding/complete] Failed to mark token used:', tokenError)
      }
    }
  }

  // ── 5b. MODE: direct ──────────────────────────────────────────────────
  else if (body.mode === 'direct') {
    const { data: inserted, error: insertError } = await admin
      .from('patients')
      .insert({
        user_id:               user.id,
        clinic_id:             null,
        gender:                body.gender,
        date_of_birth:         body.date_of_birth,
        height_cm:             heightCm,
        weight_kg:             weightKg,
        goal_type:             body.goal_type,
        workout_frequency:     body.workout_frequency,
        target_weight:         targetWeightKg,
        weight_loss_speed:     body.weight_loss_speed,
        barriers:              body.barriers,
        diet_type:             body.diet_type,
        wellness_goals:        body.wellness_goals,
        rollover_calories:     body.rollover_calories,
        add_exercise_calories: body.add_exercise_calories,
        referral_source:       body.referral_source,
        invite_status:         'self_registered',
        onboarding_complete:   true,
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      console.error('[onboarding/complete] Failed to insert patient:', insertError)
      return NextResponse.json({ error: 'Failed to create patient record' }, { status: 500 })
    }

    finalPatientId = inserted.id
  }

  else {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  // ── 6. Log initial weight ─────────────────────────────────────────────
  if (finalPatientId) {
    const { error: weightError } = await admin
      .from('weight_logs')
      .insert({
        patient_id: finalPatientId,
        weight_kg:  weightKg,
        logged_at:  new Date().toISOString(),
      })

    if (weightError) {
      // Non-fatal — log but don't fail the request
      console.error('[onboarding/complete] Failed to insert weight log:', weightError)
    }
  }

  // ── 7. Success ────────────────────────────────────────────────────────
  return NextResponse.json({ success: true })
}
