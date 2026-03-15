// Admin panel — lists all clinics and their patients.
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
  clinic_id:  string
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

  // ── Fetch all patients across all clinics ──────────────────────────────────
  const clinicIds = (clinics ?? []).map(c => c.id)
  const { data: patients } = clinicIds.length > 0
    ? await admin
        .from('patients')
        .select('id, first_name, last_name, age, bmi, clinic_id')
        .in('clinic_id', clinicIds)
        .order('first_name')
    : { data: [] }

  // ── Group patients by clinic ───────────────────────────────────────────────
  const patientsByClinic: Record<string, PatientRow[]> = {}
  for (const p of (patients ?? []) as PatientRow[]) {
    const existing = patientsByClinic[p.clinic_id] ?? []
    patientsByClinic[p.clinic_id] = [...existing, p]
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <h2
        className="font-playfair"
        style={{ fontSize: 24, color: '#1A1A1A', margin: '0 0 4px' }}
      >
        Admin Panel
      </h2>
      <p
        className="font-dm-sans"
        style={{ fontSize: 13, color: '#999', marginBottom: 28 }}
      >
        Select a patient to view their experience
      </p>

      {/* Clinic groups */}
      {(clinics ?? []).map(clinic => {
        const clinicPatients = patientsByClinic[clinic.id] ?? []
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
                {clinicPatients.length} patient{clinicPatients.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Patient rows */}
            {clinicPatients.length === 0 ? (
              <p
                className="font-dm-sans"
                style={{ fontSize: 13, color: '#CCC', padding: '10px 16px' }}
              >
                No patients enrolled yet
              </p>
            ) : (
              clinicPatients.map(p => {
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
                    {/* Left: name + meta */}
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

                    {/* Right: impersonate button */}
                    <ImpersonateButton patientId={p.id} />
                  </div>
                )
              })
            )}
          </div>
        )
      })}

      {(clinics ?? []).length === 0 && (
        <div style={{
          background:   '#fff',
          borderRadius: 16,
          padding:      40,
          textAlign:    'center',
          boxShadow:    '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🏥</p>
          <p className="font-dm-sans" style={{ color: '#999', fontSize: 14 }}>No clinics found</p>
        </div>
      )}
    </div>
  )
}
