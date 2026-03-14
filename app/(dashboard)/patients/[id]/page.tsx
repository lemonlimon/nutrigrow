// CHANGE 1: headings → #1a1a1a, body → #1a1a1a/#666, green kept only where specified
// CHANGE 2: hero delta card added between patient info and Weekly Digest
import { createAdminClient } from '@/lib/supabase/admin'
import { WeightChart }       from '@/components/WeightChart'

// ── Helpers ───────────────────────────────────────────────────────────────────
function sevenDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

function fourWeeksAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 28)
  return d.toISOString()
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
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
        className="font-dm-sans uppercase text-[11px] mb-1.5"
        style={{ color: '#888', letterSpacing: '0.05em' }}
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
  const weekStart = sevenDaysAgo()

  // ── Fetch all data in parallel ────────────────────────────────────────────
  const [
    { data: patient },
    { data: weightLogs },
    { data: mostRecentLog },
    { data: foodLogs },
    { data: contextLogs },
  ] = await Promise.all([
    admin
      .from('patients')
      .select('id, first_name, weight_kg, enrolled_at')
      .eq('id', patientId)
      .single(),

    // 4 weeks for the chart
    admin
      .from('weight_logs')
      .select('weight_kg, logged_at')
      .eq('patient_id', patientId)
      .gte('logged_at', fourWeeksAgo())
      .order('logged_at', { ascending: false }),

    // Most recent log ever — for hero delta (no date filter)
    admin
      .from('weight_logs')
      .select('weight_kg, logged_at')
      .eq('patient_id', patientId)
      .order('logged_at', { ascending: false })
      .limit(1),

    admin
      .from('food_logs')
      .select('calories_estimate_low, calories_estimate_high, logged_at')
      .eq('patient_id', patientId)
      .gte('logged_at', weekStart),

    admin
      .from('context_logs')
      .select('context, logged_at')
      .eq('patient_id', patientId)
      .gte('logged_at', weekStart),
  ])

  // ── Compute: weight trend (most recent 2 logs within 4 weeks) ─────────────
  let weightTrend:      string
  let weightTrendColor: string
  if (!weightLogs || weightLogs.length < 2) {
    weightTrend      = 'No change logged this week'
    weightTrendColor = '#666666'
  } else {
    const delta = weightLogs[0].weight_kg - weightLogs[1].weight_kg
    const abs   = Math.abs(delta).toFixed(1)
    if      (delta < 0) { weightTrend = `Down ${abs} kg this week`; weightTrendColor = '#1D9E75' }
    else if (delta > 0) { weightTrend = `Up ${abs} kg this week`;   weightTrendColor = '#B94040' }
    else                { weightTrend = 'No change this week';       weightTrendColor = '#666666' }
  }

  // ── Compute: hero delta (enrollment → most recent ever) ───────────────────
  const heroLog = mostRecentLog?.[0] ?? null
  const heroDelta = heroLog && patient
    ? heroLog.weight_kg - patient.weight_kg
    : null

  // ── Compute: weekly calorie range ─────────────────────────────────────────
  const mealsWithCalories = (foodLogs ?? []).filter(
    f => f.calories_estimate_low != null && f.calories_estimate_high != null
  )
  const weeklyCalLow  = mealsWithCalories.reduce((sum, f) => sum + (f.calories_estimate_low  ?? 0), 0)
  const weeklyCalHigh = mealsWithCalories.reduce((sum, f) => sum + (f.calories_estimate_high ?? 0), 0)
  const mealCount     = mealsWithCalories.length

  // ── Compute: context summary ──────────────────────────────────────────────
  const contextCounts: Record<string, number> = {}
  for (const log of (contextLogs ?? [])) {
    contextCounts[log.context] = (contextCounts[log.context] ?? 0) + 1
  }
  const contextSummary = Object.entries(contextCounts)
    .map(([ctx, n]) => `${CONTEXT_LABELS[ctx] ?? ctx} ×${n}`)
    .join(', ')

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[560px]">

      {/* Patient name heading — CHANGE 1: near-black not green */}
      <h2
        className="font-playfair font-bold mb-6"
        style={{ fontSize: 28, color: '#1a1a1a' }}
      >
        {patient ? patient.first_name : `Patient ${patientId.slice(0, 8)}…`}
      </h2>

      {/* Patient info card */}
      <div className="bg-white rounded-card shadow-sm border border-gray-100 px-8 py-6 mb-4">
        {patient ? (
          <div className="space-y-1 font-dm-sans text-sm">
            <p style={{ color: '#666' }}>
              Starting weight:{' '}
              <span style={{ color: '#1a1a1a', fontWeight: 500 }}>{patient.weight_kg} kg</span>
            </p>
            <p style={{ color: '#666' }}>
              Enrolled:{' '}
              <span style={{ color: '#1a1a1a', fontWeight: 500 }}>{fmtDate(patient.enrolled_at)}</span>
            </p>
          </div>
        ) : (
          <p style={{ color: '#666' }} className="font-dm-sans text-sm">Patient not found.</p>
        )}
      </div>

      {/* ── CHANGE 2: Hero delta card ─────────────────────────────────────── */}
      {patient && (
        <div className="bg-white rounded-card shadow-sm border border-gray-100 px-8 py-6 mb-6">
          {heroDelta !== null ? (() => {
            const isDown  = heroDelta < 0
            const isUp    = heroDelta > 0
            const absD    = Math.abs(heroDelta).toFixed(1)
            const color   = isDown ? '#1D9E75' : isUp ? '#B94040' : '#666666'
            const arrow   = isDown ? '↓' : isUp ? '↑' : ''
            const display = isDown
              ? `−${absD} kg`
              : isUp ? `+${absD} kg` : 'No change'

            return (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  {arrow && (
                    <span style={{ fontSize: 28, color, fontWeight: 700,
                                   fontFamily: 'DM Sans, system-ui, sans-serif', lineHeight: 1 }}>
                      {arrow}
                    </span>
                  )}
                  <span style={{ fontSize: 32, color, fontWeight: 700,
                                 fontFamily: 'DM Sans, system-ui, sans-serif', lineHeight: 1 }}>
                    {display}
                  </span>
                </div>
                <p style={{ color: '#999', fontSize: 13, marginTop: 6,
                             fontFamily: 'DM Sans, system-ui, sans-serif' }}>
                  since enrollment · {fmtDateShort(patient.enrolled_at)}
                </p>
              </>
            )
          })() : (
            <>
              <span style={{ fontSize: 32, color: '#666', fontWeight: 700,
                             fontFamily: 'DM Sans, system-ui, sans-serif', lineHeight: 1 }}>
                No logs yet
              </span>
              <p style={{ color: '#999', fontSize: 13, marginTop: 6,
                           fontFamily: 'DM Sans, system-ui, sans-serif' }}>
                since enrollment · {fmtDateShort(patient.enrolled_at)}
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Weekly Digest ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
        {/* CHANGE 1: "Weekly Digest" keeps brand green — it's a special heading */}
        <h3 className="font-playfair text-lg mb-5" style={{ color: '#0D5C45' }}>
          Weekly Digest
        </h3>

        <div className="space-y-5">

          {/* Weight trend */}
          <DigestRow label="WEIGHT TREND">
            {weightLogs && weightLogs.length >= 1 && patient && (
              <div className="mb-2">
                <WeightChart
                  points={[...weightLogs].reverse()}
                  baseline={{ weight_kg: patient.weight_kg, enrolled_at: patient.enrolled_at }}
                />
              </div>
            )}
            {/* CHANGE 1: color varies by direction */}
            <p className="font-dm-sans text-sm font-medium" style={{ color: weightTrendColor }}>
              {weightTrend}
            </p>
          </DigestRow>

          {/* Estimated calories — CHANGE 1: value in #1a1a1a not green */}
          <DigestRow label="ESTIMATED CALORIES">
            {mealCount > 0 ? (
              <>
                <p className="font-dm-sans text-sm font-medium" style={{ color: '#1a1a1a' }}>
                  ~{weeklyCalLow.toLocaleString()}–{weeklyCalHigh.toLocaleString()} kcal logged this week
                </p>
                <p className="font-dm-sans text-[13px] mt-0.5" style={{ color: '#888' }}>
                  Based on {mealCount} meal photo{mealCount !== 1 ? 's' : ''}
                </p>
              </>
            ) : (
              <p className="font-dm-sans text-sm" style={{ color: '#888' }}>
                No meals logged this week
              </p>
            )}
          </DigestRow>

          {/* Context summary — CHANGE 1: value in #1a1a1a not green */}
          <DigestRow label="CONTEXT THIS WEEK">
            <p
              className="font-dm-sans text-sm font-medium"
              style={{ color: contextSummary ? '#1a1a1a' : '#888' }}
            >
              {contextSummary || 'No context logged this week'}
            </p>
          </DigestRow>

        </div>
      </div>
    </div>
  )
}
