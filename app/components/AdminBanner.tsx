// Server component — reads mizan_admin_viewing cookie and renders an amber
// banner when an admin is impersonating a patient. Returns null when not set.

import { cookies }           from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminBanner() {
  const cookieStore = cookies()
  const adminCookie = cookieStore.get('mizan_admin_viewing')
  if (!adminCookie?.value) return null

  const admin = createAdminClient()
  const { data: pat } = await admin
    .from('patients')
    .select('first_name, last_name')
    .eq('id', adminCookie.value)
    .single()

  const fullName = pat
    ? `${pat.first_name}${pat.last_name ? ' ' + pat.last_name : ''}`
    : 'Patient'

  return (
    <div
      style={{
        background:    '#FFF3CD',
        borderBottom:  '2px solid #F5A623',
        padding:       '10px 20px',
        display:       'flex',
        justifyContent:'space-between',
        alignItems:    'center',
      }}
    >
      <span
        className="font-dm-sans"
        style={{ fontSize: 14, color: '#92640A', fontWeight: 700 }}
      >
        👁 Admin view: {fullName}
      </span>

      {/* Exit uses a tiny form so it works without client JS */}
      <form action="/api/admin/exit" method="POST">
        <button
          type="submit"
          className="font-dm-sans"
          style={{
            fontSize:     12,
            color:        '#92640A',
            background:   'transparent',
            border:       '1px solid #F5A623',
            borderRadius: 6,
            padding:      '4px 10px',
            cursor:       'pointer',
          }}
        >
          Exit admin view →
        </button>
      </form>
    </div>
  )
}
