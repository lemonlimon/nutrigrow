// Server wrapper for the patient home page.
// Reads the admin impersonation cookie, verifies the admin role,
// then passes adminPatientId + adminPatientName down to the client component.
// When no cookie is set, both props are null and the client component
// falls back to its normal user_id-based patient lookup.

import { cookies }           from 'next/headers'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PatientHomeClient     from './PatientHomeClient'
import AdminBanner           from '@/app/components/AdminBanner'

export default async function PatientHomePage() {
  const cookieStore = cookies()
  const adminCookie = cookieStore.get('mizan_admin_viewing')

  let adminPatientId:   string | null = null
  let adminPatientName: string | null = null
  let adminPatient:     {
    id:                 string
    first_name:         string
    preferred_language: string
    weight_kg:          number
    enrolled_at:        string
  } | null = null

  if (adminCookie?.value) {
    // Verify the requesting user is actually an admin before trusting the cookie
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const admin = createAdminClient()
      const { data: rolesData } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      const isAdmin = (rolesData ?? []).some(r => r.role === 'admin')
      if (isAdmin) {
        // Fetch full patient object via admin client (bypasses RLS).
        // Passing it to PatientHomeClient means the client skips its own
        // anon-key patient query, which would be blocked by RLS.
        const { data: pat } = await admin
          .from('patients')
          .select('id, first_name, last_name, preferred_language, weight_kg, enrolled_at')
          .eq('id', adminCookie.value)
          .single()

        if (pat) {
          adminPatientId   = pat.id
          adminPatientName = `${pat.first_name}${pat.last_name ? ' ' + pat.last_name : ''}`
          adminPatient     = {
            id:                 pat.id,
            first_name:         pat.first_name,
            preferred_language: pat.preferred_language ?? 'en',
            weight_kg:          pat.weight_kg,
            enrolled_at:        pat.enrolled_at,
          }
        }
      }
    }
  }

  return (
    <>
      <AdminBanner />
      <PatientHomeClient
        adminPatientId={adminPatientId}
        adminPatientName={adminPatientName}
        adminPatient={adminPatient}
      />
    </>
  )
}
