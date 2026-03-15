// Admin panel — lists all clinics and their patients, plus direct/self-registered patients.
// Only accessible if user has role === 'admin' in user_roles.

import { redirect }          from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ImpersonateButton } from './ImpersonateButton'

type PatientRow = {
  id:        string
  first_name: string
  last_name:  string | null
  age:        number | null
  bmi:        number | null
  clinic_id:  string | null
}

type DirectPatientRow = {
  id:                  string
  first_name:          string
  last_name:           string | null
  subscription_status: string | null
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      flex:          1,
      minWidth:      0,
      background:    '#fff',
      borderRadius:  10,
      padding:       '16px 12px',
      textAlign:     'center',
      boxShadow:     '0 1px 3px rgba(0,0,0,0.06)',
      border:        '1px solid #F0F0F0',
    }}>
      <p
        className="font-dm-sans"
        style={{ fontSize: 24, fontWeight: 700, color: '#0D5C45', margin: 0, lineHeight: 1 }}
      >
        {value}
      </p>
      <p
        className="font-dm-sans"
        style={{ fontSize: 12, color: '#999', margin: '6px 0 0', lineHeight: 1.3 }}
      >
        {label}
      </p>
    </div>
  )
}

// ── Subscription badge ─────────────────────────────────────────────────────────
function SubBadge({ status }: { status: string | null }) {
  const isPro = status === 'pro'
  return (
    <span
      className="font-dm-sans"
      style={{
        display:      'inline-block',
        fontSize:     11,
        fontWeight:   600,
        padding:      '2px 8px',
        borderRadius: 20,
        background:   isPro ? '#E8F5F0' : '#F5F5F5',
        color:        isPro ? '#0D5C45' : '#999',
        border:       `1px solid ${isPro ? '#C0E8D8' : '#E0E0E0'}`,
        whiteSpace:   'nowrap' as const,
      }}
    >
      {isPro ? '✦ Pro' : 'Free'}
    </span>
  )
}

export default async function AdminPage() {
  // ── Auth + role check ──────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: rolesData } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)

  const isAdmin = (rolesData ?? []).some(r => r.role === 'admin')
  if (!isAdmin) redirect('/dashboard')

  // ── Fetch all clinics ──────────────────────────────────────────────────────
  const { data: clinics } = await admin
    .from('clinics')
    .select('id, name')
    .order('name')

  // ── Fetch all clinic patients ──────────────────────────────────────────────
  const clinicIds = (clinics ?? []).map(c => c.id)
  const { data: clinicPatients } = clinicIds.length > 0
    ? await admin
        .from('patients')
        .select('id, first_name, last_name, age, bmi, clinic_id')
        .in('clinic_id', clinicIds)
        .order('first_name')
    : { data: [] as PatientRow[] }

  // ── Fetch direct (self-registered) patients ────────────────────────────────
  const { data: directPatients } = await admin
    .from('patients')
    .select('id, first_name, last_name, subscription_status')
    .is('clinic_id', null)
    .order('first_name')

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalClinics        = (clinics ?? []).length
  const totalClinicPatients = (clinicPatients ?? []).length
  const totalDirect         = (directPatients ?? []).length
  const totalAll            = totalClinicPatients + totalDirect

  // ── Group clinic patients by clinic ───────────────────────────────────────
  const patientsByClinic: Record<string, PatientRow[]> = {}
  for (const p of (clinicPatients ?? []) as PatientRow[]) {
    if (!p.clinic_id) continue
    const existing = patientsByClinic[p.clinic_id] ?? []
    patientsByClinic[p.clinic_id] = [...existing, p]
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Page header ── */}
      <h2
        className="font-playfair"
        style={{ fontSize: 24, color: '#1A1A1A', margin: '0 0 4px' }}
      >
        Admin Panel
      </h2>
      <p
        className="font-dm-sans"
        style={{ fontSize: 13, color: '#999', marginBottom: 24 }}
      >
        Select a patient to view their experience
      </p>

      {/* ── Stats bar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' as const }}>
        <StatCard label="Total Clinics"     value={totalClinics}        />
        <StatCard label="Clinic Patients"   value={totalClinicPatients} />
        <StatCard label="Direct Patients"   value={totalDirect}         />
        <StatCard label="All Patients"      value={totalAll}            />
      </div>

      {/* ── Clinic groups ── */}
      {(clinics ?? []).map(clinic => {
        const rows = patientsByClinic[clinic.id] ?? []
        return (
          <div key={clinic.id} style={{ marginBottom: 32 }}>

            {/* Clinic header */}
            <div style={{
              background:   '#E8F5F0',
              borderRadius: 8,
              padding:      '10px 16px',
              marginBottom: 8,
              display:      'flex',
              alignItems:   'center',
              gap:          10,
            }}>
              <span
                className="font-playfair"
                style={{ fontSize: 16, color: '#0D5C45' }}
              >
                {clinic.name}
              </span>
              <span
                className="font-dm-sans"
                style={{ fontSize: 12, color: '#1D9E75', fontWeight: 600 }}
              >
                {rows.length} patient{rows.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Patient rows */}
            {rows.length === 0 ? (
              <p
                className="font-dm-sans"
                style={{ fontSize: 13, color: '#CCC', padding: '10px 16px' }}
              >
                No patients enrolled yet
              </p>
            ) : (
              rows.map(p => {
                const fullName = p.last_name ? `${p.first_name} ${p.last_name}` : p.first_name
                const meta = [
                  p.age  ? `Age ${p.age}`                     : null,
                  p.bmi  ? `BMI ${Number(p.bmi).toFixed(1)}`  : null,
                ].filter(Boolean).join(' · ')

                return (
                  <div
                    key={p.id}
                    style={{
                      background:     '#fff',
                      borderRadius:   10,
                      padding:        '14px 16px',
                      marginBottom:   6,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'space-between',
                      gap:            12,
                      boxShadow:      '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p
                        className="font-dm-sans"
                        style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', margin: 0 }}
                      >
                        {fullName}
                      </p>
                      {meta && (
                        <p
                          className="font-dm-sans"
                          style={{ fontSize: 12, color: '#999', margin: '2px 0 0' }}
                        >
                          {meta}
                        </p>
                      )}
                    </div>
                    <ImpersonateButton patientId={p.id} />
                  </div>
                )
              })
            )}
          </div>
        )
      })}

      {/* ── Direct / Self-Registered patients ── */}
      {(directPatients ?? []).length > 0 && (
        <div style={{ marginBottom: 32 }}>

          {/* Section header */}
          <div style={{
            background:   '#EDE9FE',
            borderRadius: 8,
            padding:      '10px 16px',
            marginBottom: 8,
            display:      'flex',
            alignItems:   'center',
            gap:          10,
          }}>
            <span
              className="font-playfair"
              style={{ fontSize: 16, color: '#6D28D9' }}
            >
              Direct / Self-Registered
            </span>
            <span
              className="font-dm-sans"
              style={{ fontSize: 12, color: '#7C3AED', fontWeight: 600 }}
            >
              {totalDirect} patient{totalDirect !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Patient rows */}
          {(directPatients as DirectPatientRow[]).map(p => {
            const fullName = p.last_name ? `${p.first_name} ${p.last_name}` : p.first_name
            return (
              <div
                key={p.id}
                style={{
                  background:     '#fff',
                  borderRadius:   10,
                  padding:        '14px 16px',
                  marginBottom:   6,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'space-between',
                  gap:            12,
                  boxShadow:      '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                {/* Left: name + subscription badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <p
                    className="font-dm-sans"
                    style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', margin: 0 }}
                  >
                    {fullName}
                  </p>
                  <SubBadge status={p.subscription_status} />
                </div>

                {/* Right: View button (disabled for now) */}
                <button
                  type="button"
                  disabled
                  className="font-dm-sans"
                  style={{
                    fontSize:     13,
                    fontWeight:   600,
                    color:        '#999',
                    background:   '#F5F5F5',
                    border:       '1px solid #E0E0E0',
                    borderRadius: 8,
                    padding:      '8px 14px',
                    cursor:       'not-allowed',
                    whiteSpace:   'nowrap' as const,
                    flexShrink:   0,
                  }}
                >
                  View
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Empty state ── */}
      {(clinics ?? []).length === 0 && totalDirect === 0 && (
        <div style={{
          background:   '#fff',
          borderRadius: 16,
          padding:      40,
          textAlign:    'center',
          boxShadow:    '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🏥</p>
          <p className="font-dm-sans" style={{ color: '#999', fontSize: 14 }}>No clinics or patients found</p>
        </div>
      )}
    </div>
  )
}
