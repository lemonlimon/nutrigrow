import Link                  from 'next/link'
import { redirect }          from 'next/navigation'
import { startOfDay }        from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminClinicSwitcher } from '../AdminClinicSwitcher'

const TIMEZONE    = 'Asia/Riyadh'
const DEFAULT_CLINIC = '00000000-0000-0000-0000-000000000001'

// ── SVG Icons ─────────────────────────────────────────────────────────────────
function IconPerson() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="#0D5C45" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 20c0-4 3.582-6 8-6s8 2 8 6" />
    </svg>
  )
}

function IconCamera() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="#0D5C45" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function IconStar() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="#0D5C45" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

function IconScale() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="#0D5C45" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18"/>
      <path d="M5 8l7-5 7 5"/>
      <path d="M3 12h6M15 12h6"/>
      <path d="M3 12a3 3 0 006 0"/>
      <path d="M15 12a3 3 0 006 0"/>
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getActivityTier(lastLoggedAt: string | undefined): 0 | 1 | 2 | 3 {
  if (!lastLoggedAt) return 3
  const diffMs   = Date.now() - new Date(lastLoggedAt).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 1)  return 0  // green  — today
  if (diffDays <= 3) return 1  // amber  — 1–3 days
  if (diffDays <= 6) return 2  // orange — 4–6 days
  return 3                     // grey   — 7+ or never
}

const DOT_COLOR = ['#1D9E75', '#F5A623', '#E8623A', '#CCC'] as const

function fmtLastLogged(lastLoggedAt: string | undefined): string {
  if (!lastLoggedAt) return 'Never logged'
  const diffMs   = Date.now() - new Date(lastLoggedAt).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 1)  return 'Logged today'
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // ── Role lookup ───────────────────────────────────────────────────────────
  const { data: roleData } = await admin
    .from('user_roles')
    .select('role, clinic_id')
    .eq('user_id', user.id)
    .single()

  const isAdmin = roleData?.role === 'admin'
  const requestedClinic = typeof searchParams?.clinic === 'string'
    ? searchParams.clinic
    : undefined

  const clinicId = isAdmin
    ? (requestedClinic ?? DEFAULT_CLINIC)
    : roleData?.clinic_id

  if (!clinicId) redirect('/login')

  // ── For admin: fetch all clinics for the switcher ─────────────────────────
  const allClinics = isAdmin
    ? ((await admin.from('clinics').select('id, name').order('name')).data ?? [])
    : []

  // ── Timezone-aware "today" for KSA/UAE (UTC+3) ────────────────────────────
  const nowInRiyadh  = toZonedTime(new Date(), TIMEZONE)
  const todayStart   = fromZonedTime(startOfDay(nowInRiyadh), TIMEZONE)
  const todayStr     = nowInRiyadh.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const sevenDaysBack = new Date()
  sevenDaysBack.setDate(sevenDaysBack.getDate() - 7)

  // Step 1: fetch patients first (need IDs for sub-queries)
  const { data: patients } = await admin
    .from('patients')
    .select('id, first_name, last_name, bmi, enrolled_at')
    .eq('clinic_id', clinicId)
    .order('enrolled_at', { ascending: false })

  type PatientRow = { id: string; first_name: string; last_name: string | null; bmi: number | null; enrolled_at: string }
  const rows        = (patients ?? []) as PatientRow[]
  const totalPatients = rows.length
  const patientIds    = rows.map(p => p.id)

  // Step 2: parallel stat + activity queries
  let loggedToday   = 0
  let avgMealScore: number | null = null
  let weekWeighIns  = 0
  let lastFoodMap:   Record<string, { logged_at: string; meal_score: number | null }> = {}
  let lastWeightMap: Record<string, string> = {}

  if (patientIds.length > 0) {
    const [
      { data: todayFoodLogs },
      { data: weekFoodScores },
      { count: weekWeighInCount },
      { data: rpcFoodLogs },
      { data: rpcWeightLogs },
    ] = await Promise.all([
      // patients who logged anything today
      admin.from('food_logs')
        .select('patient_id')
        .in('patient_id', patientIds)
        .gte('logged_at', todayStart.toISOString()),

      // meal scores this week (for avg)
      admin.from('food_logs')
        .select('meal_score')
        .in('patient_id', patientIds)
        .gte('logged_at', sevenDaysBack.toISOString())
        .not('meal_score', 'is', null),

      // weigh-ins this week (count only)
      admin.from('weight_logs')
        .select('*', { count: 'exact', head: true })
        .in('patient_id', patientIds)
        .gte('logged_at', sevenDaysBack.toISOString()),

      // last food log per patient — efficient RPC, no LIMIT 500 needed
      admin.rpc('get_last_food_log_per_patient', { patient_ids: patientIds }),

      // last weight log per patient — efficient RPC
      admin.rpc('get_last_weight_log_per_patient', { patient_ids: patientIds }),
    ])

    // Logged today: distinct patients
    const loggedSet = new Set(
      (todayFoodLogs ?? []).map((l: { patient_id: string }) => l.patient_id)
    )
    loggedToday = loggedSet.size

    // Avg meal score
    const scores = (weekFoodScores ?? []).map((l: { meal_score: number | null }) => l.meal_score as number)
    if (scores.length > 0) {
      avgMealScore = scores.reduce((a, b) => a + b, 0) / scores.length
    }

    weekWeighIns = weekWeighInCount ?? 0

    // Last food per patient — RPC already returns one row per patient
    for (const log of (rpcFoodLogs ?? [])) {
      const l = log as { patient_id: string; last_logged_at: string; meal_score: number | null }
      lastFoodMap = { ...lastFoodMap, [l.patient_id]: { logged_at: l.last_logged_at, meal_score: l.meal_score } }
    }

    // Last weight per patient — RPC already returns one row per patient
    for (const log of (rpcWeightLogs ?? [])) {
      const l = log as { patient_id: string; last_logged_at: string }
      lastWeightMap = { ...lastWeightMap, [l.patient_id]: l.last_logged_at }
    }
  }

  // ── Derived colors ────────────────────────────────────────────────────────
  const loggedPct   = totalPatients > 0 ? loggedToday / totalPatients : 0
  const loggedColor = loggedPct > 0.5 ? '#1D9E75' : loggedPct >= 0.25 ? '#F5A623' : '#E8623A'
  const scoreColor  = avgMealScore === null
    ? '#CCC'
    : avgMealScore >= 7 ? '#1D9E75'
    : avgMealScore >= 4 ? '#F5A623'
    : '#E8623A'

  // ── Sort: green → amber → orange → grey ───────────────────────────────────
  const sortedRows = [...rows].sort((a, b) =>
    getActivityTier(lastFoodMap[a.id]?.logged_at) -
    getActivityTier(lastFoodMap[b.id]?.logged_at)
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
    {/* ── Admin clinic switcher (admin only) ── */}
    {isAdmin && (
      <AdminClinicSwitcher clinics={allClinics} currentClinicId={clinicId} />
    )}

    {/* ── Today's date ── */}
    <p
      className="font-dm-sans"
      style={{ fontSize: 13, color: '#999', textAlign: 'center', margin: '16px 0 20px' }}
    >
      {todayStr}
    </p>

    {/* ── Hero stats 2×2 ── */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>

      {/* Card 1 — Total Patients */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <IconPerson />
        <p className="font-dm-sans" style={{ fontSize: 32, fontWeight: 700, color: '#1A1A1A', lineHeight: 1, marginTop: 8 }}>
          {totalPatients}
        </p>
        <p className="font-dm-sans uppercase" style={{ fontSize: 11, color: '#999', letterSpacing: '0.06em', marginTop: 4 }}>
          TOTAL PATIENTS
        </p>
      </div>

      {/* Card 2 — Logged Today */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <IconCamera />
        <p className="font-dm-sans" style={{ fontSize: 32, fontWeight: 700, color: loggedColor, lineHeight: 1, marginTop: 8 }}>
          {loggedToday}
        </p>
        <p className="font-dm-sans" style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
          of {totalPatients} patients
        </p>
        <p className="font-dm-sans uppercase" style={{ fontSize: 11, color: '#999', letterSpacing: '0.06em', marginTop: 4 }}>
          LOGGED TODAY
        </p>
      </div>

      {/* Card 3 — Avg Meal Score */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <IconStar />
        <p className="font-dm-sans" style={{ fontSize: 32, fontWeight: 700, color: scoreColor, lineHeight: 1, marginTop: 8 }}>
          {avgMealScore !== null ? avgMealScore.toFixed(1) : '—'}
        </p>
        <p className="font-dm-sans uppercase" style={{ fontSize: 11, color: '#999', letterSpacing: '0.06em', marginTop: 4 }}>
          AVG MEAL SCORE
        </p>
      </div>

      {/* Card 4 — Weigh-ins */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <IconScale />
        <p className="font-dm-sans" style={{ fontSize: 32, fontWeight: 700, color: '#1A1A1A', lineHeight: 1, marginTop: 8 }}>
          {weekWeighIns}
        </p>
        <p className="font-dm-sans uppercase" style={{ fontSize: 11, color: '#999', letterSpacing: '0.06em', marginTop: 4 }}>
          WEIGH-INS
        </p>
      </div>

    </div>

    {/* ── Patient list ── */}
    <div style={{ marginBottom: 32 }}>

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span className="font-playfair" style={{ fontSize: 20, color: '#1A1A1A' }}>
          Patients
        </span>
        <span
          className="font-dm-sans"
          style={{
            background: '#E8F5F0', color: '#0D5C45',
            padding: '2px 10px', borderRadius: 20,
            fontSize: 12, fontWeight: 700,
          }}
        >
          {totalPatients}
        </span>
        <a
          href="/enroll"
          className="font-dm-sans"
          style={{
            marginLeft: 'auto', background: '#0D5C45', color: '#fff',
            padding: '6px 14px', borderRadius: 8,
            fontSize: 12, fontWeight: 600, textDecoration: 'none',
          }}
        >
          + Enroll
        </a>
      </div>

      {/* Empty state */}
      {sortedRows.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🌿</p>
          <p className="font-dm-sans" style={{ color: '#999', fontSize: 14 }}>No patients enrolled yet</p>
        </div>
      )}

      {/* Patient rows */}
      {sortedRows.map((p) => {
        const lastFood   = lastFoodMap[p.id]
        const tier       = getActivityTier(lastFood?.logged_at)
        const dotColor   = DOT_COLOR[tier]
        const lastLogTxt = fmtLastLogged(lastFood?.logged_at)
        const fullName   = p.last_name ? `${p.first_name} ${p.last_name}` : p.first_name

        return (
          <Link
            key={p.id}
            href={`/patients/${p.id}`}
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            12,
              background:     '#fff',
              borderRadius:   12,
              padding:        '16px 16px',
              marginBottom:   8,
              boxShadow:      '0 1px 3px rgba(0,0,0,0.05)',
              textDecoration: 'none',
            }}
          >
            {/* Activity dot */}
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />

            {/* Name + last logged */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="font-dm-sans" style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
                {fullName}
              </p>
              <p className="font-dm-sans" style={{ fontSize: 13, color: '#999', margin: '2px 0 0' }}>
                {lastLogTxt}
              </p>
            </div>

            {/* BMI pill + chevron */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {p.bmi !== null && (
                <span
                  className="font-dm-sans"
                  style={{
                    background: '#F5F5F5', color: '#666',
                    fontSize: 12, borderRadius: 20,
                    padding: '3px 10px',
                  }}
                >
                  BMI {p.bmi}
                </span>
              )}
              <span style={{ fontSize: 18, color: '#CCC', lineHeight: 1 }}>›</span>
            </div>
          </Link>
        )
      })}

    </div>
    </>
  )
}
