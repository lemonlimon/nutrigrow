// CHANGE 1: headings → #1a1a1a, no green on body text
// CHANGE 5: last-logged signal added per patient row
import Link                  from 'next/link'
import { redirect }          from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Patient {
  id:          string
  first_name:  string
  age:         number | null
  sex:         string | null
  weight_kg:   number | null
  enrolled_at: string
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function capitalize(s: string | null): string {
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// "Last logged today" / "2 days ago" / "No activity yet"
function fmtLastLogged(iso: string | undefined): string {
  if (!iso) return 'No activity yet'
  const diffMs   = Date.now() - new Date(iso).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Last logged today'
  if (diffDays === 1) return 'Last logged yesterday'
  return `Last logged ${diffDays} days ago`
}

export default async function PatientsPage() {
  // ── Auth + dynamic clinic ID ───────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: clinicData } = await admin
    .from('clinics')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  const clinicId = clinicData?.id
  if (!clinicId) redirect('/login')

  // ── Fetch patients ────────────────────────────────────────────────────────
  const { data: patients, error } = await admin
    .from('patients')
    .select('id, first_name, age, sex, weight_kg, enrolled_at')
    .eq('clinic_id', clinicId)
    .order('enrolled_at', { ascending: false })

  if (error) console.error('[PatientsPage] query failed:', error)

  const rows = (patients ?? []) as Patient[]

  // ── Fetch last activity for all patients in 2 bulk queries ────────────────
  let lastActivity: Record<string, string> = {}

  if (rows.length > 0) {
    const ids = rows.map(p => p.id)

    const [{ data: wLogs }, { data: fLogs }] = await Promise.all([
      admin
        .from('weight_logs')
        .select('patient_id, logged_at')
        .in('patient_id', ids)
        .order('logged_at', { ascending: false }),
      admin
        .from('food_logs')
        .select('patient_id, logged_at')
        .in('patient_id', ids)
        .order('logged_at', { ascending: false }),
    ])

    // Keep the most recent timestamp per patient across both tables
    for (const log of [...(wLogs ?? []), ...(fLogs ?? [])]) {
      const cur = lastActivity[log.patient_id]
      if (!cur || log.logged_at > cur) {
        lastActivity = { ...lastActivity, [log.patient_id]: log.logged_at }
      }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl">

      {/* Header — CHANGE 1: near-black heading */}
      <div className="flex items-center justify-between mb-8">
        <h2
          className="font-playfair font-bold"
          style={{ fontSize: 28, color: '#1a1a1a' }}
        >
          Patients
        </h2>
        <a
          href="/enroll"
          className="bg-brand-dark text-white px-5 py-2.5 rounded-btn
                     text-sm font-dm-sans font-medium hover:opacity-90 transition"
        >
          + Enroll Patient
        </a>
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-16 text-center">
          <p className="text-4xl mb-4">🌿</p>
          <p className="font-dm-sans text-base" style={{ color: '#666' }}>
            No patients enrolled yet
          </p>
          <p className="font-dm-sans text-sm mt-1" style={{ color: '#999' }}>
            Use the enroll link to add your first patient
          </p>
        </div>
      )}

      {/* Patient rows */}
      {rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-card shadow-sm border border-gray-100
                         px-6 py-5 flex items-center justify-between gap-4"
            >
              {/* Left: name + meta + last logged */}
              <div className="flex-1 min-w-0">
                {/* CHANGE 1: patient name in near-black */}
                <p className="font-dm-sans font-semibold text-base truncate"
                   style={{ color: '#1a1a1a' }}>
                  {p.first_name}
                </p>
                <p className="font-dm-sans text-sm mt-0.5" style={{ color: '#666' }}>
                  {capitalize(p.sex)}
                  {p.age      ? `, ${p.age} yrs` : ''}
                  {p.weight_kg ? ` · ${p.weight_kg} kg` : ''}
                </p>
                {/* CHANGE 5: last logged signal */}
                <p className="font-dm-sans mt-0.5" style={{ fontSize: 12, color: '#999' }}>
                  {fmtLastLogged(lastActivity[p.id])}
                </p>
              </div>

              {/* Middle: enrolled date */}
              <div className="hidden sm:block text-right flex-shrink-0">
                <p className="font-dm-sans uppercase mb-0.5"
                   style={{ fontSize: 11, color: '#888', letterSpacing: '0.05em' }}>
                  Enrolled
                </p>
                <p className="font-dm-sans text-sm" style={{ color: '#666' }}>
                  {fmtDate(p.enrolled_at)}
                </p>
              </div>

              {/* View button */}
              <Link
                href={`/patients/${p.id}`}
                className="flex-shrink-0 border border-brand-dark text-brand-dark bg-transparent
                           px-4 py-2 rounded-btn text-sm font-dm-sans font-medium
                           hover:bg-brand-light transition"
              >
                View
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
