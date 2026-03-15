import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require a logged-in admin/clinic user
const CLINIC_ROUTES = ['/dashboard', '/patients']

function isClinicRoute(pathname: string): boolean {
  return CLINIC_ROUTES.some(
    route => pathname === route || pathname.startsWith(route + '/')
  )
}

function isPatientRoute(pathname: string): boolean {
  return pathname === '/patient/home' || pathname.startsWith('/patient/home/')
}

function redirect(request: NextRequest, pathname: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  return NextResponse.redirect(url)
}

export async function middleware(request: NextRequest) {
  // Must use a mutable response so @supabase/ssr can refresh the session cookie
  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: do not add any logic between createServerClient and getUser()
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (!user) {
    if (isClinicRoute(pathname) || isPatientRoute(pathname)) {
      return redirect(request, '/login')
    }
    return supabaseResponse
  }

  // ── Authenticated — look up role ───────────────────────────────────────────
  // user_roles must have RLS: SELECT WHERE user_id = auth.uid()
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role as 'admin' | 'clinic' | 'patient' | undefined

  // ── /login — redirect based on role ───────────────────────────────────────
  if (pathname === '/login') {
    if (role === 'patient') return redirect(request, '/patient/home')
    return redirect(request, '/dashboard')
  }

  // ── Clinic/admin routes (/dashboard, /patients) ────────────────────────────
  if (isClinicRoute(pathname)) {
    if (role === 'patient') return redirect(request, '/patient/home')
    if (!role)              return redirect(request, '/login')
    // role === 'admin' or 'clinic' → allow through
    return supabaseResponse
  }

  // ── Patient route (/patient/home) ──────────────────────────────────────────
  if (isPatientRoute(pathname)) {
    if (role === 'clinic') return redirect(request, '/dashboard')
    // role === 'admin' (impersonation), 'patient', or no role → allow
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  // Run on all routes except Next.js internals and static assets
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
