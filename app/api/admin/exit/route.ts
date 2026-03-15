// POST /api/admin/exit
// Clears the admin impersonation cookie and lets the caller redirect to /admin.

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'

export async function POST() {
  const cookieStore = cookies()
  cookieStore.delete('mizan_admin_viewing')
  return NextResponse.json({ success: true })
}
