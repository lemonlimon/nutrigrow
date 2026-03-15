// Server wrapper for the patient home page.
// Reads the admin impersonation cookie, verifies the admin role,
// then passes adminPatientId + adminPatientName down to the client component.
// When no cookie is set, both props are null and the client component
// falls back to its normal user_id-based patient lookup.

import { cookies }           from 'next/headers'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PatientHomeClient     from './PatientHomeClient'

export default async function PatientHomePage() {
  const cookieStore = cookies()
  const adminCookie = cookieStore.get('mizan_admin_viewing')

  let adminPatientId:   string | null = null
  let adminPatientName: string | null = null

  if (adminCookie?.value) {
    // Verify the requesting user is actually an admin before trusting the cookie
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const admin = createAdminClient()
      const { data: roleData } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (roleData?.role === 'admin') {
        // Fetch the patient's name for the banner
        const { data: pat } = await admin
          .from('patients')
          .select('first_name, last_name')
          .eq('id', adminCookie.value)
          .single()

        adminPatientId   = adminCookie.value
        adminPatientName = pat
          ? `${pat.first_name}${pat.last_name ? ' ' + pat.last_name : ''}`
          : 'Patient'
      }
    }
  }

  return (
    <PatientHomeClient
      adminPatientId={adminPatientId}
      adminPatientName={adminPatientName}
    />
  )
}
