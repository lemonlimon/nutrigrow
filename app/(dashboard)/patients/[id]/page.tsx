// Patient detail — physician view
// Visual refresh: back button, hero pills, activity banner, restyled weekly digest
import { format, parseISO }  from 'date-fns'
import { createAdminClient } from '@/lib/supabase/admin'
import { WeightChart }       from '@/components/WeightChart'

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

const CONTEXT_LABELS: Record<string, string> = {
  regular:          'Regular day',
  family_gathering: 'Family gathering',
  ramadan:          'Ramadan',
  travel:           'Travel',
  stressed:         'Stressed',
}

// ── DigestRow ─────────────────────────────────────────────────────────────────
function DigestRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        className="font-dm-sans uppercase"
        style={{ fontSize: 11, color: '#999', letterSpacing: '0.06em', marginBottom: 10 }}
      >
        {label}
      </p>
      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function PatientDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const admin     = createAdminClient()
  const patientId = params.id
  const weekStart = daysAgo(7)
  const fourWeeksStart = daysAgo(28)

  // ── Fetch all data in parallel ────────────────────────────────────────────
  const [
    { data: patient },
    { data: weightLogs },
    { data: mostRecentWeightLog },
    { data: foodLogs },
    { data: contextLogs },
    { data: lastFoodLog },
  ] = await Promise.all([
    admin
      .from('patients')
      .select('id, first_name, last_name, date_of_birth, weight_kg, enrolled_at, age, bmi')
      .eq('id', patientId)
      .single(),

    // 4 weeks for chart
    admin
      .from('weight_logs')
      .select('weight_kg, logged_at')
      .eq('patient_id', patientId)
      .gte('logged_at', fourWeeksStart)
      .order('logged_at', { ascending: false }),

    // Most recent weight ever — for hero delta
    admin
      .from('weight_logs')
      .select('weight_kg, logged_at')
      .eq('patient_id', patientId)
      .order('logged_at', { ascending: false })
      .limit(1),

    // This week's food logs
    admin
      .from('food_logs')
      .select('calories_estimate_low, calories_estimate_high, logged_at')
      .eq('patient_id', patientId)
      .gte('logged_at', weekStart),

    // This week's context logs
    admin
      .from('context_logs')
      .select('context, logged_at')
      .eq('patient_id', patientId)
      .gte('logged_at', weekStart),

    // Most recent food log ever — for activity banner
    admin
      .from('food_logs')
      .select('logged_at')
      .eq('patient_id', patientId)
      .order('logged_at', { ascending: false })
      .limit(1),
  ])

  // ── Activity banner logic ──────────────────────────────────────────────────
  type BannerTier = 'today' | 'recent' | 'stale' | 'never'
  let bannerTier: BannerTier = 'never'
  let daysSinceLog            = 0

  const lastFoodAt = lastFoodLog?.[0]?.logged_at
  if (lastFoodAt) {
    daysSinceLog = Math.floor(
      (Date.now() - new Date(lastFoodAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceLog < 1)       bannerTier = 'today'
    else if (daysSinceLog <= 3) bannerTier = 'recent'
    else                        bannerTier = 'stale'
  }

  const BANNER: Record<BannerTier, { bg: string; color: string; text: string }> = {
    today:  { bg: '#E8F5F0', color: '#1D9E75', text: '✓ Logged today' },
    recent: { bg: '#FFF8EB', color: '#D4860A', text: `Last logged ${daysSinceLog} day${daysSinceLog !== 1 ? 's' : ''} ago` },
    stale:  { bg: '#FFF0EB', color: '#E8623A', text: `⚠ No log in ${daysSinceLog} days` },
    never:  { bg: '#F5F5F5', color: '#999',    text: 'No logs yet' },
  }
  const banner = BANNER[bannerTier]

  // ── Weight trend ──────────────────────────────────────────────────────────
  let weightTrend:      string
  let weightTrendColor: string
  if (!weightLogs || weightLogs.length < 2) {
    weightTrend      = 'No change logged this week'
    weightTrendColor = '#666'
  } else {
    const delta = weightLogs[0].weight_kg - weightLogs[1].weight_kg
    const abs   = Math.abs(delta).toFixed(1)
    if      (delta < 0) { weightTrend = `Down ${abs} kg this week`; weightTrendColor = '#1D9E75' }
    else if (delta > 0) { weightTrend = `Up ${abs} kg this week`;   weightTrendColor = '#E8623A' }
    else                { weightTrend = 'No change this week';       weightTrendColor = '#666' }
  }

  // ── Hero delta ────────────────────────────────────────────────────────────
  const heroLog   = mostRecentWeightLog?.[0] ?? null
  const heroDelta = heroLog && patient
    ? heroLog.weight_kg - patient.weight_kg
    : null

  // ── Weekly calories ───────────────────────────────────────────────────────
  const mealsWithCal = (foodLogs ?? []).filter(
    f => f.calories_estimate_low != null && f.calories_estimate_high != null
  )
  const weeklyCalLow  = mealsWithCal.reduce((s, f) => s + (f.calories_estimate_low  ?? 0), 0)
  const weeklyCalHigh = mealsWithCal.reduce((s, f) => s + (f.calories_estimate_high ?? 0), 0)
  const mealCount     = mealsWithCal.length

  // ── Context summary ───────────────────────────────────────────────────────
  const contextCounts: Record<string, number> = {}
  for (const log of (contextLogs ?? [])) {
    contextCounts[log.context] = (contextCounts[log.context] ?? 0) + 1
  }
  const contextSummary = Object.entries(contextCounts)
    .map(([ctx, n]) => `${CONTEXT_LABELS[ctx] ?? ctx} ×${n}`)
    .join(', ')

  // ── Pill helper ───────────────────────────────────────────────────────────
  const typedPatient = patient as (typeof patient & {
    last_name?: string | null
    date_of_birth?: string | null
    age?: number | null
    bmi?: number | null
  }) | null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 560 }}>

      {/* ── Back button ── */}
      <a
        href="/patients"
        className="font-dm-sans"
        style={{
          display:        'inline-flex',
          alignItems:     'center',
          gap:            4,
          fontSize:       14,
          color:          '#0D5C45',
          textDecoration: 'none',
          marginBottom:   16,
        }}
      >
        ← Patients
      </a>

      {/* ── Patient hero ── */}
      <div style={{ marginBottom: 16 }}>
        <h2
          className="font-playfair font-bold"
          style={{ fontSize: 28, color: '#1A1A1A', margin: 0 }}
        >
          {typedPatient
            ? typedPatient.last_name
              ? `${typedPatient.first_name} ${typedPatient.last_name}`
              : typedPatient.first_name
            : `Patient ${patientId.slice(0, 8)}…`}
        </h2>

        {/* Info pills */}
        {typedPatient && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {typedPatient.bmi != null && (
              <span
                className="font-dm-sans"
                style={{ background: '#F5F5F5', color: '#666', fontSize: 12, borderRadius: 20, padding: '4px 12px' }}
              >
                BMI {Number(typedPatient.bmi).toFixed(1)}
              </span>
            )}
            {typedPatient.age != null && (
              <span
                className="font-dm-sans"
                style={{ background: '#F5F5F5', color: '#666', fontSize: 12, borderRadius: 20, padding: '4px 12px' }}
              >
                Age {typedPatient.age}
              </span>
            )}
            {typedPatient.date_of_birth != null && (
              <span
                className="font-dm-sans"
                style={{ background: '#F5F5F5', color: '#666', fontSize: 12, borderRadius: 20, padding: '4px 12px' }}
              >
                DOB {format(parseISO(typedPatient.date_of_birth), 'MMM d, yyyy')}
              </span>
            )}
            <span
              className="font-dm-sans"
              style={{ background: '#F5F5F5', color: '#666', fontSize: 12, borderRadius: 20, padding: '4px 12px' }}
            >
              Enrolled {format(parseISO(typedPatient.enrolled_at), 'MMM d')}
            </span>
          </div>
        )}
      </div>

      {/* ── Activity banner ── */}
      <div
        className="font-dm-sans"
        style={{
          background:   banner.bg,
          color:        banner.color,
          borderRadius: 10,
          padding:      '10px 14px',
          fontSize:     13,
          fontWeight:   600,
          marginBottom: 20,
        }}
      >
        {banner.text}
      </div>

      {/* ── Weight delta card ── */}
      {typedPatient && (
        <div
          style={{
            background:   '#fff',
            borderRadius: 16,
            padding:      20,
            boxShadow:    '0 1px 4px rgba(0,0,0,0.06)',
            marginBottom: 12,
          }}
        >
          {heroDelta !== null ? (() => {
            const isDown  = heroDelta < 0
            const isUp    = heroDelta > 0
            const absD    = Math.abs(heroDelta).toFixed(1)
            const color   = isDown ? '#1D9E75' : isUp ? '#E8623A' : '#666'
            const arrow   = isDown ? '↓' : isUp ? '↑' : ''
            const display = isDown ? `−${absD} kg` : isUp ? `+${absD} kg` : 'No change'
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  {arrow && (
                    <span className="font-dm-sans" style={{ fontSize: 28, color, fontWeight: 700, lineHeight: 1 }}>
                      {arrow}
                    </span>
                  )}
                  <span className="font-dm-sans" style={{ fontSize: 32, color, fontWeight: 700, lineHeight: 1 }}>
                    {display}
                  </span>
                </div>
                <p className="font-dm-sans" style={{ color: '#999', fontSize: 13, marginTop: 6 }}>
                  since enrollment · {format(parseISO(typedPatient.enrolled_at), 'MMM d, yyyy')}
                </p>
              </>
            )
          })() : (
            <>
              <span className="font-dm-sans" style={{ fontSize: 32, color: '#666', fontWeight: 700, lineHeight: 1 }}>
                No logs yet
              </span>
              <p className="font-dm-sans" style={{ color: '#999', fontSize: 13, marginTop: 6 }}>
                since enrollment · {format(parseISO(typedPatient.enrolled_at), 'MMM d, yyyy')}
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Weekly Digest ── */}
      <div
        style={{
          background:   '#fff',
          borderRadius: 16,
          padding:      20,
          boxShadow:    '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <p className="font-playfair" style={{ fontSize: 18, color: '#0D5C45', marginBottom: 20 }}>
          Weekly Digest
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Weight trend */}
          <DigestRow label="WEIGHT TREND">
            {weightLogs && weightLogs.length >= 1 && typedPatient && (
              <div style={{ marginBottom: 8 }}>
                <WeightChart
                  points={[...weightLogs].reverse()}
                  baseline={{ weight_kg: typedPatient.weight_kg, enrolled_at: typedPatient.enrolled_at }}
                />
              </div>
            )}
            <p className="font-dm-sans font-medium" style={{ fontSize: 14, color: weightTrendColor }}>
              {weightTrend}
            </p>
          </DigestRow>

          {/* Calories divider */}
          <div style={{ borderTop: '1px solid #F0F0F0' }} />

          {/* Estimated calories */}
          <DigestRow label="ESTIMATED CALORIES">
            {mealCount > 0 ? (
              <>
                <p className="font-dm-sans font-medium" style={{ fontSize: 14, color: '#1A1A1A' }}>
                  ~{weeklyCalLow.toLocaleString()}–{weeklyCalHigh.toLocaleString()} kcal this week
                </p>
                <p className="font-dm-sans" style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  Based on {mealCount} meal photo{mealCount !== 1 ? 's' : ''}
                </p>
              </>
            ) : (
              <p className="font-dm-sans" style={{ fontSize: 14, color: '#BBB' }}>
                No meals logged this week
              </p>
            )}
          </DigestRow>

          {/* Context divider */}
          <div style={{ borderTop: '1px solid #F0F0F0' }} />

          {/* Context */}
          <DigestRow label="CONTEXT THIS WEEK">
            <p className="font-dm-sans font-medium" style={{ fontSize: 14, color: contextSummary ? '#1A1A1A' : '#BBB' }}>
              {contextSummary || 'No context logged this week'}
            </p>
          </DigestRow>

        </div>
      </div>

    </div>
  )
}
