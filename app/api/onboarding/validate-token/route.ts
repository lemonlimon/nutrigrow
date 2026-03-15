import { NextResponse }      from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ valid: false, reason: 'missing' })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (err) {
    console.error('[validate-token] Failed to create admin client:', err)
    return NextResponse.json({ valid: false, reason: 'server_error' }, { status: 500 })
  }

  const { data, error } = await admin
    .from('invite_tokens')
    .select('id, email, clinic_id, patient_id, used_at, expires_at')
    .eq('token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ valid: false, reason: 'not_found' })
  }

  if (data.used_at) {
    return NextResponse.json({ valid: false, reason: 'already_used' })
  }

  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'expired' })
  }

  return NextResponse.json({
    valid:     true,
    email:     data.email,
    clinicId:  data.clinic_id,
    patientId: data.patient_id,
  })
}
