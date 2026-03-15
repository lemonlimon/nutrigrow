'use client'

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { createClient }        from '@supabase/supabase-js'
import { format, subDays }     from 'date-fns'
import { WeightChart }         from '@/components/WeightChart'

// ── Supabase browser client ───────────────────────────────────────────────────
function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Patient {
  id:          string
  first_name:  string
  weight_kg:   number   // enrolled weight (baseline)
  enrolled_at: string
}

interface WeightLog { weight_kg: number; logged_at: string }


interface WeeklyAvg {
  calories: number
  protein:  number
  carbs:    number
  fat:      number
  days:     number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Uses date-fns to compute streak in LOCAL timezone
function calcStreak(logDates: string[]): number {
  const dateSet = new Set(logDates.map(d => d.slice(0, 10)))
  let streak = 0
  for (let i = 0; i < 60; i++) {
    const key = format(subDays(new Date(), i), 'yyyy-MM-dd')
    if (dateSet.has(key)) { streak++ } else { break }
  }
  return streak
}

// ── Small layout primitives ───────────────────────────────────────────────────
function PageCard({
  children,
  style,
}: {
  children: React.ReactNode
  style?:   React.CSSProperties
}) {
  return (
    <div
      style={{
        background:   '#fff',
        borderRadius: 16,
        padding:      20,
        boxShadow:    '0 1px 4px rgba(0,0,0,0.06)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-dm-sans uppercase"
      style={{ fontSize: 11, color: '#999', letterSpacing: '0.08em', marginBottom: 12 }}
    >
      {children}
    </p>
  )
}

// ── Progress page ─────────────────────────────────────────────────────────────
export default function PatientProgressPage() {
  const router = useRouter()

  const [patient,       setPatient]       = useState<Patient | null>(null)
  const [recentWeights, setRecentWeights] = useState<WeightLog[]>([])
  const [firstWeight,   setFirstWeight]   = useState<WeightLog | null>(null)
  const [weeklyAvg,     setWeeklyAvg]     = useState<WeeklyAvg | null>(null)
  const [streak,        setStreak]        = useState(0)
  const [photoStreak,   setPhotoStreak]   = useState(0)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    const load = async () => {
      const db = supabase()

      const { data: { user }, error: authErr } = await db.auth.getUser()
      if (authErr || !user) { router.replace('/patient/login'); return }

      const { data: pat, error: patErr } = await db
        .from('patients')
        .select('id, first_name, weight_kg, enrolled_at')
        .eq('user_id', user.id)
        .single()
      if (patErr || !pat) { router.replace('/patient/login'); return }
      setPatient(pat as Patient)

      // Date anchors
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      thirtyDaysAgo.setHours(0, 0, 0, 0)

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      sevenDaysAgo.setHours(0, 0, 0, 0)

      const [
        { data: wRecent },
        { data: wFirst  },
        { data: weekFood },
        { data: streakFood },
      ] = await Promise.all([
        // Recent weight logs for chart + latest value
        db.from('weight_logs')
          .select('weight_kg, logged_at')
          .eq('patient_id', pat.id)
          .order('logged_at', { ascending: false })
          .limit(30),

        // Earliest weight log ever (starting weight)
        db.from('weight_logs')
          .select('weight_kg, logged_at')
          .eq('patient_id', pat.id)
          .order('logged_at', { ascending: true })
          .limit(1),

        // Food logs last 7 days for weekly averages
        db.from('food_logs')
          .select('calories_estimate_low, calories_estimate_high, protein_g, carbs_g, fat_g, logged_at')
          .eq('patient_id', pat.id)
          .gte('logged_at', sevenDaysAgo.toISOString()),

        // Food log dates last 30 days for streak
        db.from('food_logs')
          .select('logged_at')
          .eq('patient_id', pat.id)
          .gte('logged_at', thirtyDaysAgo.toISOString()),
      ])

      setRecentWeights(wRecent ?? [])
      setFirstWeight(wFirst?.[0] ?? null)

      // Weekly averages — divide by days that have logs, not by 7
      if (weekFood && weekFood.length > 0) {
        const days = new Set(weekFood.map(r => r.logged_at.slice(0, 10))).size || 1
        const totalCal = weekFood.reduce(
          (s, r) => s + ((r.calories_estimate_low ?? 0) + (r.calories_estimate_high ?? 0)) / 2,
          0
        )
        setWeeklyAvg({
          calories: Math.round(totalCal / days),
          protein:  Math.round(weekFood.reduce((s, r) => s + (r.protein_g ?? 0), 0) / days),
          carbs:    Math.round(weekFood.reduce((s, r) => s + (r.carbs_g   ?? 0), 0) / days),
          fat:      Math.round(weekFood.reduce((s, r) => s + (r.fat_g     ?? 0), 0) / days),
          days,
        })
      }

      const foodDates = (streakFood ?? []).map(r => r.logged_at)
      setPhotoStreak(calcStreak(foodDates))
      // General streak uses food logs too (same source for now — photo is primary activity)
      setStreak(calcStreak(foodDates))

      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="font-dm-sans" style={{ fontSize: 14, color: '#BBB' }}>Loading…</p>
      </div>
    )
  }

  if (!patient) return null

  const latestWeight  = recentWeights[0] ?? null
  const startWeight   = firstWeight
  const weightChange  = latestWeight && startWeight
    ? Math.round((latestWeight.weight_kg - startWeight.weight_kg) * 10) / 10
    : null
  const weightChangeColor =
    weightChange === null ? '#999'
    : weightChange < 0    ? '#1D9E75'
    : weightChange > 0    ? '#C0392B'
    :                       '#999'

  // Chart needs ascending order
  const chartPoints = [...recentWeights].reverse()

  const weeklyStats = [
    { icon: '🔥', label: 'Avg calories',  value: weeklyAvg ? `${weeklyAvg.calories} kcal` : '—' },
    { icon: '🥩', label: 'Avg protein',   value: weeklyAvg ? `${weeklyAvg.protein}g`       : '—' },
    { icon: '🌾', label: 'Avg carbs',     value: weeklyAvg ? `${weeklyAvg.carbs}g`          : '—' },
    { icon: '🫒', label: 'Avg fat',       value: weeklyAvg ? `${weeklyAvg.fat}g`            : '—' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', paddingBottom: 96 }}>
      <div
        style={{
          width:         '100%',
          maxWidth:      480,
          margin:        '0 auto',
          padding:       '32px 16px 0',
          display:       'flex',
          flexDirection: 'column',
          gap:           16,
        }}
      >

        {/* Page title */}
        <div style={{ paddingLeft: 4 }}>
          <p className="font-playfair" style={{ fontSize: 24, color: '#1A1A1A' }}>
            Your Progress
          </p>
          <p className="font-dm-sans" style={{ fontSize: 13, color: '#999', marginTop: 4 }}>
            {patient.first_name}
          </p>
        </div>

        {/* ── Section A — Streak cards ── */}
        <div style={{ display: 'flex', gap: 12 }}>

          {/* Card 1 — Logging streak */}
          <PageCard style={{ flex: 1 }}>
            {streak >= 1 ? (
              <>
                <div
                  className="font-dm-sans font-bold"
                  style={{ fontSize: 36, color: '#F5A623', lineHeight: 1 }}
                >
                  🔥 {streak}
                </div>
                <div
                  className="font-dm-sans"
                  style={{ fontSize: 14, color: '#999', marginTop: 4 }}
                >
                  day streak
                </div>
                <div
                  className="font-dm-sans"
                  style={{ fontSize: 11, color: '#CCC', marginTop: 2 }}
                >
                  consecutive days logged
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🔥</div>
                <div
                  className="font-dm-sans"
                  style={{ fontSize: 14, color: '#CCC', fontStyle: 'italic' }}
                >
                  Start today!
                </div>
              </>
            )}
          </PageCard>

          {/* Card 2 — Photo streak */}
          <PageCard style={{ flex: 1 }}>
            {photoStreak >= 1 ? (
              <>
                <div
                  className="font-dm-sans font-bold"
                  style={{ fontSize: 36, color: '#E8623A', lineHeight: 1 }}
                >
                  📸 {photoStreak}
                </div>
                <div
                  className="font-dm-sans"
                  style={{ fontSize: 14, color: '#999', marginTop: 4 }}
                >
                  photo streak
                </div>
                <div
                  className="font-dm-sans"
                  style={{ fontSize: 11, color: '#CCC', marginTop: 2 }}
                >
                  consecutive meal photos
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 28, marginBottom: 6 }}>📸</div>
                <div
                  className="font-dm-sans"
                  style={{ fontSize: 14, color: '#CCC', fontStyle: 'italic' }}
                >
                  Start today!
                </div>
              </>
            )}
          </PageCard>

        </div>

        {/* ── Section B — Weight change summary ── */}
        {(startWeight || latestWeight) && (
          <PageCard>
            <SectionLabel>Weight change</SectionLabel>

            {/* Start / Change / Now row */}
            <div
              style={{
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'flex-start',
                marginBottom:   20,
              }}
            >
              {/* Start */}
              <div>
                <p className="font-dm-sans" style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>
                  Start
                </p>
                <p className="font-dm-sans font-bold" style={{ fontSize: 17, color: '#1A1A1A' }}>
                  {startWeight ? `${startWeight.weight_kg} kg` : '—'}
                </p>
                {startWeight && (
                  <p className="font-dm-sans" style={{ fontSize: 11, color: '#BBB', marginTop: 2 }}>
                    {fmtShortDate(startWeight.logged_at)}
                  </p>
                )}
              </div>

              {/* Delta badge */}
              {weightChange !== null && (
                <div style={{ textAlign: 'center', paddingTop: 4 }}>
                  <p
                    className="font-dm-sans font-bold"
                    style={{ fontSize: 22, color: weightChangeColor }}
                  >
                    {weightChange > 0 ? `+${weightChange}` : weightChange} kg
                  </p>
                  <p className="font-dm-sans" style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                    {weightChange < 0 ? 'lost' : weightChange > 0 ? 'gained' : 'no change'}
                  </p>
                  {startWeight && (
                    <p className="font-dm-sans" style={{ fontSize: 10, color: '#BBB', marginTop: 1 }}>
                      since {fmtShortDate(startWeight.logged_at)}
                    </p>
                  )}
                </div>
              )}

              {/* Now */}
              <div style={{ textAlign: 'right' }}>
                <p className="font-dm-sans" style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>
                  Now
                </p>
                <p className="font-dm-sans font-bold" style={{ fontSize: 17, color: '#1A1A1A' }}>
                  {latestWeight ? `${latestWeight.weight_kg} kg` : '—'}
                </p>
                {latestWeight && (
                  <p className="font-dm-sans" style={{ fontSize: 11, color: '#BBB', marginTop: 2 }}>
                    {fmtShortDate(latestWeight.logged_at)}
                  </p>
                )}
              </div>
            </div>

            {/* Goal progress bar */}
            <div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}
              >
                <p className="font-dm-sans" style={{ fontSize: 11, color: '#999' }}>Goal progress</p>
                <p className="font-dm-sans" style={{ fontSize: 11, color: '#BBB' }}>Goal not set yet</p>
              </div>
              <div style={{ height: 6, background: '#F0F0F0', borderRadius: 99 }}>
                <div style={{ height: 6, width: '0%', background: '#1D9E75', borderRadius: 99 }} />
              </div>
            </div>
          </PageCard>
        )}

        {/* ── Section C — Weight chart (last 30 entries) ── */}
        {chartPoints.length >= 2 && (
          <PageCard>
            <SectionLabel>Weight over time</SectionLabel>
            <WeightChart
              points={chartPoints}
              baseline={{ weight_kg: patient.weight_kg, enrolled_at: patient.enrolled_at }}
            />
          </PageCard>
        )}

        {/* ── Section D — This week's nutrition averages ── */}
        <PageCard>
          <SectionLabel>This week&apos;s nutrition</SectionLabel>

          {!weeklyAvg ? (
            <p className="font-dm-sans" style={{ fontSize: 14, color: '#BBB' }}>
              No meals logged this week
            </p>
          ) : (
            <>
              <p className="font-dm-sans" style={{ fontSize: 11, color: '#BBB', marginBottom: 14 }}>
                Daily average over {weeklyAvg.days} day{weeklyAvg.days !== 1 ? 's' : ''} with data
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {weeklyStats.map(({ icon, label, value }) => (
                  <div
                    key={label}
                    style={{
                      background:   '#FAFAF8',
                      borderRadius: 12,
                      padding:      '12px 14px',
                    }}
                  >
                    <p
                      className="font-dm-sans uppercase"
                      style={{ fontSize: 10, color: '#999', letterSpacing: '0.06em', marginBottom: 5 }}
                    >
                      {icon} {label}
                    </p>
                    <p
                      className="font-dm-sans font-bold"
                      style={{ fontSize: 18, color: '#1A1A1A' }}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </PageCard>


      </div>
    </div>
  )
}
