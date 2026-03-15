import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. Static / infrastructure paths — never need auth ──────────────────────
  // These are allowed through unconditionally (no session read).
  const alwaysPublic = [
    '/patient/signup',
    '/join',
    '/onboarding',     // onboarding flow (unauthenticated and authenticated)
    '/auth/callback',  // OAuth / magic-link code exchange
    '/api/',
    '/_next/',
    '/favicon',
    '/manifest',
    '/icons',
    '/robots',
  ]
  if (alwaysPublic.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ── 2. Build Supabase client with correct cookie threading ──────────────────
  // Per @supabase/ssr docs: setAll must update BOTH the request cookies AND
  // the response cookies so that a refreshed session token is persisted.
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use getSession() — decodes the JWT from the cookie locally with NO network
  // call. Safe for Edge Runtime. All actual data access is protected by RLS.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  // ── 3. /login — special handling ────────────────────────────────────────────
  // Unauthenticated users see the login page normally.
  // Authenticated users are redirected to the right home screen so they don't
  // land on the login form after already being signed in.
  if (pathname.startsWith('/login')) {
    if (!user) return NextResponse.next()

    // Already authenticated — redirect based on role.
    // One DB call here is acceptable: /login is not a hot path.
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      const isPrivileged = (roles ?? []).some(
        r => r.role === 'admin' || r.role === 'clinic'
      )
      return NextResponse.redirect(
        new URL(isPrivileged ? '/dashboard' : '/patient/home', request.url)
      )
    } catch {
      // DB error — safest fallback is patient home (never /login which would loop)
      return NextResponse.redirect(new URL('/patient/home', request.url))
    }
  }

  // ── 4. All other routes require authentication ────────────────────────────
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── 5. /patient/* — any authenticated user may access ─────────────────────
  // No role check needed; the page itself enforces what each user can see.
  // This is the critical rule: never block an authenticated user from
  // /patient/home regardless of what role they have in user_roles.
  if (pathname.startsWith('/patient/')) {
    return response
  }

  // ── 6. Privileged routes — require admin or clinic role ───────────────────
  // Only run the DB query for paths that actually need role enforcement.
  const privilegedPaths = ['/dashboard', '/patients', '/admin']
  if (privilegedPaths.some(p => pathname.startsWith(p))) {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      const isAdmin  = (roles ?? []).some(r => r.role === 'admin')
      const isClinic = (roles ?? []).some(r => r.role === 'clinic')

      if (!isAdmin && !isClinic) {
        // Authenticated but not privileged — send to patient home
        return NextResponse.redirect(new URL('/patient/home', request.url))
      }
    } catch (err) {
      // DB error — redirect rather than letting unknown users into admin pages
      console.error('[Middleware] Role check error:', err)
      return NextResponse.redirect(new URL('/patient/home', request.url))
    }
  }

  // ── 7. Authenticated, no special rule matched — pass through ──────────────
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
