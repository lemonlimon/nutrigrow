import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. ALWAYS allow these paths through, no checks ──
  const publicPaths = [
    '/login',
    '/patient/signup',
    '/join',
    '/api/',
    '/_next/',
    '/favicon',
    '/manifest',
    '/icons',
    '/robots',
  ]

  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ── 2. Create Supabase client with PROPER cookie threading ──
  // Per @supabase/ssr docs: setAll must update BOTH request cookies
  // AND the response cookies so the refreshed session is persisted.
  // An empty setAll means every getUser() call "refreshes" in memory
  // but never commits — so middleware sees null user on every request.
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
          // Step 1: apply to the request so subsequent getAll() calls see them
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Step 2: create new response that carries the updated cookies
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use getSession() instead of getUser() in middleware.
  // getUser() makes a live network call to Supabase which can silently
  // fail in Next.js Edge Runtime. getSession() decodes the JWT from the
  // cookie directly — no network call, works reliably in Edge Runtime.
  // Routing decisions here are safe; all data access is still
  // protected by Supabase RLS policies.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  // ── 3. Not logged in — send to /login ──
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── 4. Logged in — role-based routing ──
  // Wrapped in try/catch: a DB error must NEVER lock users out.
  try {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role, clinic_id')
      .eq('user_id', user.id)

    const isAdmin   = roles?.some(r => r.role === 'admin')
    const isClinic  = roles?.some(r => r.role === 'clinic')
    const isPatient = roles?.some(r => r.role === 'patient')

    // Admin goes anywhere — never redirect admin
    if (isAdmin) {
      return response
    }

    // Clinic staff trying to access patient routes
    if (isClinic && pathname.startsWith('/patient')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Patient trying to access clinic/admin routes
    if (isPatient && (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/patients') ||
      pathname.startsWith('/admin')
    )) {
      return NextResponse.redirect(new URL('/patient/home', request.url))
    }

    // No role in user_roles — check patients table
    // (patients enrolled before user_roles existed)
    if (!isAdmin && !isClinic && !isPatient) {
      if (
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/patients') ||
        pathname.startsWith('/admin')
      ) {
        const { data: patientRecord } = await supabase
          .from('patients')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (patientRecord) {
          return NextResponse.redirect(new URL('/patient/home', request.url))
        }

        // Unknown role and no patient record — let them through rather than
        // creating a redirect loop. The page itself will handle auth errors.
        return response
      }
    }
  } catch (err) {
    // If ANY error in role check, let them through — errors must never
    // lock users out.
    console.error('[Middleware] Role check error:', err)
    return response
  }

  // Return the response object so any session cookies set by setAll
  // are actually sent back to the browser.
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
