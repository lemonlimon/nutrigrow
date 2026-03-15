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

  // ── 2. Create Supabase client to check session ──
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(_cookiesToSet) {
          // middleware can't set cookies directly,
          // handled by response below
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ── 3. Not logged in — send to /login ──
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── 4. Logged in — check role for routing ──
  // Only check role for paths that need it
  // Use try/catch so a DB error never locks users out
  try {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role, clinic_id')
      .eq('user_id', user.id)

    const isAdmin   = roles?.some(r => r.role === 'admin')
    const isClinic  = roles?.some(r => r.role === 'clinic')
    const isPatient = roles?.some(r => r.role === 'patient')

    // Admin can go anywhere — never redirect admin
    if (isAdmin) {
      return NextResponse.next()
    }

    // Clinic staff trying to access patient routes
    if (isClinic && pathname.startsWith('/patient')) {
      return NextResponse.redirect(
        new URL('/dashboard', request.url)
      )
    }

    // Patient trying to access clinic routes
    if (isPatient && (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/patients') ||
      pathname.startsWith('/admin')
    )) {
      return NextResponse.redirect(
        new URL('/patient/home', request.url)
      )
    }

    // No role in user_roles — check patients table
    // (patients enrolled before user_roles existed)
    if (!isAdmin && !isClinic && !isPatient) {
      if (
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/patients') ||
        pathname.startsWith('/admin')
      ) {
        // Check if they're a patient
        const { data: patientRecord } = await supabase
          .from('patients')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (patientRecord) {
          // They're a patient, redirect away from clinic routes
          return NextResponse.redirect(
            new URL('/patient/home', request.url)
          )
        }

        // Unknown user — send to login
        return NextResponse.redirect(
          new URL('/login', request.url)
        )
      }
    }
  } catch (error) {
    // If ANY error in role check, let them through
    // Better to allow access than lock everyone out
    console.error('Middleware role check error:', error)
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
