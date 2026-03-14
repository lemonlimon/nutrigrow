// Water Log API
// GET  /api/water-log?patientId=&date=YYYY-MM-DD  → { glasses: number }
// POST /api/water-log  body: { patientId, date, glasses }  → upsert

import { NextResponse }      from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get('patientId')
  const date      = searchParams.get('date')

  if (!patientId || !date) {
    return NextResponse.json({ success: false, error: 'Missing patientId or date' }, { status: 400 })
  }
  if (!UUID_PATTERN.test(patientId)) {
    return NextResponse.json({ success: false, error: 'Invalid patientId' }, { status: 400 })
  }
  if (!DATE_PATTERN.test(date)) {
    return NextResponse.json({ success: false, error: 'Invalid date format' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('water_logs')
    .select('glasses')
    .eq('patient_id', patientId)
    .eq('logged_date', date)
    .maybeSingle()

  if (error) {
    console.error('[water-log] GET failed:', error)
    return NextResponse.json({ success: false, error: 'Could not load water log' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { glasses: data?.glasses ?? 0 } })
}

export async function POST(request: Request) {
  let body: { patientId?: string; date?: string; glasses?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { patientId, date, glasses } = body

  if (!patientId || !date || glasses === undefined) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
  }
  if (!UUID_PATTERN.test(patientId)) {
    return NextResponse.json({ success: false, error: 'Invalid patientId' }, { status: 400 })
  }
  if (!DATE_PATTERN.test(date)) {
    return NextResponse.json({ success: false, error: 'Invalid date format' }, { status: 400 })
  }
  if (!Number.isInteger(glasses) || glasses < 0 || glasses > 8) {
    return NextResponse.json({ success: false, error: 'glasses must be an integer 0–8' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('water_logs').upsert(
    {
      patient_id:  patientId,
      logged_date: date,
      glasses,
    },
    { onConflict: 'patient_id,logged_date' }
  )

  if (error) {
    console.error('[water-log] POST failed:', error)
    return NextResponse.json({ success: false, error: 'Could not save water log' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { glasses } })
}
