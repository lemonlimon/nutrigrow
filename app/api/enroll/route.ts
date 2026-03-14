import { NextResponse }     from 'next/server'
import { createClient }     from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInvite }       from '@/lib/invite'

// Base URL for invite links — set NEXT_PUBLIC_APP_URL in production
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── Dev bypass ────────────────────────────────────────────────────────────────
// Active ONLY when both conditions are true:
//   1. ALLOW_DEV_BYPASS=true is set in .env.local
//   2. NODE_ENV is not 'production'
// Both must be true — setting the env var can never accidentally fire in prod.
const DEV_BYPASS_ACTIVE =
  process.env.ALLOW_DEV_BYPASS === 'true' &&
  process.env.NODE_ENV !== 'production'

// Fixed UUID for the test clinic row. Must exist in the clinics table.
// See test setup instructions for the one-time seed SQL.
const DEV_BYPASS_CLINIC_ID = '00000000-0000-0000-0000-000000000001'

// ── Unit conversion constants ─────────────────────────────────────────────────
const LBS_TO_KG = 0.453592
const IN_TO_CM  = 2.54

// ── Types ─────────────────────────────────────────────────────────────────────
interface EnrollBody {
  sex:           'male' | 'female'
  age:           string
  weightValue:   string
  weightUnit:    'kg' | 'lbs'
  heightValue:   string
  heightUnit:    'cm' | 'in'
  waistValue:    string
  waistUnit:     'cm' | 'in'
  firstName:     string
  contactMethod: 'email' | 'sms'
  contactValue:  string
  language:      'en' | 'ar'
}

type ValidationResult =
  | { ok: true;  data: EnrollBody }
  | { ok: false; message: string  }

// ── Helpers ───────────────────────────────────────────────────────────────────
function toMetricWeight(value: string, unit: 'kg' | 'lbs'): number {
  const n = parseFloat(value)
  return Math.round((unit === 'lbs' ? n * LBS_TO_KG : n) * 10) / 10
}

function toMetricLength(value: string, unit: 'cm' | 'in'): number {
  const n = parseFloat(value)
  return Math.round((unit === 'in' ? n * IN_TO_CM : n) * 10) / 10
}

function validateBody(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, message: 'Invalid request body' }
  }

  const b = raw as Record<string, unknown>

  if (!['male', 'female'].includes(b.sex as string)) {
    return { ok: false, message: 'Invalid sex value' }
  }

  const age = parseInt(b.age as string, 10)
  if (isNaN(age) || age < 18 || age > 75) {
    return { ok: false, message: 'Age must be between 18 and 75' }
  }

  if (isNaN(parseFloat(b.weightValue as string)) || parseFloat(b.weightValue as string) <= 0) {
    return { ok: false, message: 'Invalid weight' }
  }
  if (!['kg', 'lbs'].includes(b.weightUnit as string)) {
    return { ok: false, message: 'Invalid weight unit' }
  }

  if (isNaN(parseFloat(b.heightValue as string)) || parseFloat(b.heightValue as string) <= 0) {
    return { ok: false, message: 'Invalid height' }
  }
  if (!['cm', 'in'].includes(b.heightUnit as string)) {
    return { ok: false, message: 'Invalid height unit' }
  }

  if (isNaN(parseFloat(b.waistValue as string)) || parseFloat(b.waistValue as string) <= 0) {
    return { ok: false, message: 'Invalid waist measurement' }
  }
  if (!['cm', 'in'].includes(b.waistUnit as string)) {
    return { ok: false, message: 'Invalid waist unit' }
  }

  if (!b.firstName || typeof b.firstName !== 'string' || b.firstName.trim() === '') {
    return { ok: false, message: 'Patient first name is required' }
  }

  if (!['email', 'sms'].includes(b.contactMethod as string)) {
    return { ok: false, message: 'Invalid contact method' }
  }

  if (!b.contactValue || typeof b.contactValue !== 'string' || b.contactValue.trim() === '') {
    return { ok: false, message: 'Contact value is required' }
  }

  if (!['en', 'ar'].includes(b.language as string)) {
    return { ok: false, message: 'Invalid language' }
  }

  return { ok: true, data: b as unknown as EnrollBody }
}

// ── POST /api/enroll ──────────────────────────────────────────────────────────
export async function POST(request: Request) {

  // 1. Resolve clinic identity + choose database client
  //    Bypass: admin client skips RLS (required — no auth.uid() in dev mode)
  //    Normal: regular client, RLS enforced, clinic_id = auth.uid()
  let clinicId: string

  const db = DEV_BYPASS_ACTIVE ? createAdminClient() : createClient()

  if (DEV_BYPASS_ACTIVE) {
    clinicId = DEV_BYPASS_CLINIC_ID
  } else {
    const { data: { user }, error: authError } = await (db as ReturnType<typeof createClient>).auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    clinicId = user.id
  }

  // 2. Parse body
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  // 3. Validate
  const validation = validateBody(raw)
  if (!validation.ok) {
    return NextResponse.json({ success: false, error: validation.message }, { status: 400 })
  }

  const body = validation.data

  // 4. Convert display units to metric for storage
  const weightKg = toMetricWeight(body.weightValue, body.weightUnit)
  const heightCm = toMetricLength(body.heightValue, body.heightUnit)
  const waistCm  = toMetricLength(body.waistValue,  body.waistUnit)

  // 5. Insert
  const { data: patient, error: insertError } = await db
    .from('patients')
    .insert({
      clinic_id:          clinicId,
      first_name:         body.firstName.trim(),
      sex:                body.sex,
      age:                parseInt(body.age, 10),
      weight_kg:          weightKg,
      height_cm:          heightCm,
      waist_cm:           waistCm,
      contact_method:     body.contactMethod,
      contact_value:      body.contactValue.trim(),
      preferred_language: body.language,
    })
    .select('id, first_name, invite_token')
    .single()

  if (insertError || !patient) {
    console.error('[enroll] insert failed:', insertError)
    return NextResponse.json(
      { success: false, error: 'Enrollment failed. Please try again.' },
      { status: 500 }
    )
  }

  // 6. Build invite link
  const inviteLink = `${APP_URL}/join?token=${patient.invite_token}`

  // 7. sendInvite — stub today, swap body for Resend/Twilio when ready (lib/invite.ts)
  await sendInvite({
    contactMethod: body.contactMethod,
    contactValue:  body.contactValue.trim(),
    firstName:     patient.first_name,
    link:          inviteLink,
  })

  return NextResponse.json({
    success: true,
    data: {
      firstName:  patient.first_name,
      inviteLink,
    },
  })
}
