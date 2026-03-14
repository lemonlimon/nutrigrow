import { NextResponse }      from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── POST /api/patient/activate ────────────────────────────────────────────────
// Called by /join/signup immediately after supabase.auth.signUp() succeeds.
// Uses admin client (service role) to bypass RLS — the patient has no session
// yet (email confirmation may be pending) so auth.uid() is not usable.
//
// Body: { token: string, userId: string }
//
// Guards:
//  - Both fields must be valid UUIDs
//  - Token must exist, not be expired, and not already be active
//  - Sets user_id + invite_status = 'active' atomically
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { token, userId } = (body ?? {}) as { token?: string; userId?: string }

  if (!token || !UUID_PATTERN.test(token)) {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 400 })
  }
  if (!userId || !UUID_PATTERN.test(userId)) {
    return NextResponse.json({ success: false, error: 'Invalid userId' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify token is valid and not already activated
  const { data: patient, error: lookupError } = await admin
    .from('patients')
    .select('id, invite_status, invite_token_expires_at')
    .eq('invite_token', token)
    .maybeSingle()

  if (lookupError || !patient) {
    return NextResponse.json({ success: false, error: 'Token not found' }, { status: 404 })
  }

  if (patient.invite_status === 'active') {
    return NextResponse.json({ success: false, error: 'Already activated' }, { status: 409 })
  }

  if (new Date(patient.invite_token_expires_at) < new Date()) {
    return NextResponse.json({ success: false, error: 'Token expired' }, { status: 410 })
  }

  // Link auth user to patient row and mark active
  const { error: updateError } = await admin
    .from('patients')
    .update({ user_id: userId, invite_status: 'active' })
    .eq('id', patient.id)

  if (updateError) {
    console.error('[activate] update failed:', updateError)
    return NextResponse.json({ success: false, error: 'Activation failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
