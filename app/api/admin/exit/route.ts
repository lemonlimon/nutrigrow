// POST /api/admin/exit
// Clears the admin impersonation cookie and redirects to /admin.
// Handles both fetch() calls (JSON response) and plain form POSTs (redirect).

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'

export async function POST(request: Request) {
  const cookieStore = cookies()
  cookieStore.delete('mizan_admin_viewing')

  // Plain form POST (from AdminBanner) — redirect back to /admin
  const accept = request.headers.get('accept') ?? ''
  if (!accept.includes('application/json')) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.json({ success: true })
}
