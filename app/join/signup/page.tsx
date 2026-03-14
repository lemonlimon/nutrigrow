'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams }     from 'next/navigation'
import { createClient }                   from '@supabase/supabase-js'

// ── Anon client — same pattern as /join page ──────────────────────────────────
// No cookie layer. Required for the "Public invite token lookup" RLS policy.
function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Lang = 'en' | 'ar'

const copy = {
  en: {
    heading:      'Create your account',
    sub:          'Your clinic has invited you to MIZAN. Set up your account to get started.',
    emailLabel:   'Email address',
    passLabel:    'Password',
    passHint:     'Minimum 8 characters',
    show:         'Show',
    hide:         'Hide',
    submit:       'Create account',
    submitting:   'Creating your account…',
    success:      'Account created. Taking you to your home screen…',
    errInvalid:   'This invite link is not valid. Please contact your clinic.',
    errExpired:   'This invite link has expired. Please contact your clinic.',
    errGeneric:   'Something went wrong. Please try again.',
  },
  ar: {
    heading:      'إنشاء حسابك',
    sub:          'دعتك عيادتك للانضمام إلى ميزان. أنشئ حسابك للبدء.',
    emailLabel:   'البريد الإلكتروني',
    passLabel:    'كلمة المرور',
    passHint:     '٨ أحرف على الأقل',
    show:         'إظهار',
    hide:         'إخفاء',
    submit:       'إنشاء الحساب',
    submitting:   'جارٍ إنشاء حسابك…',
    success:      'تم إنشاء الحساب. جارٍ توجيهك…',
    errInvalid:   'رابط الدعوة غير صالح. يرجى التواصل مع عيادتك.',
    errExpired:   'انتهت صلاحية رابط الدعوة. يرجى التواصل مع عيادتك.',
    errGeneric:   'حدث خطأ ما. يرجى المحاولة مرة أخرف.',
  },
} satisfies Record<Lang, Record<string, string>>

// ── Shared shell ──────────────────────────────────────────────────────────────
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-[440px] space-y-6">
        <p className="text-center font-playfair text-xl text-brand-dark tracking-wide">
          MIZAN
        </p>
        {children}
      </div>
    </div>
  )
}

// ── Error card (invalid / expired token) ─────────────────────────────────────
function ErrorCard({ message, isAr }: { message: string; isAr: boolean }) {
  return (
    <PageShell>
      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-8">
        <p
          dir={isAr ? 'rtl' : undefined}
          lang={isAr ? 'ar' : undefined}
          className={`text-sm text-red-700 leading-relaxed ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}
        >
          {message}
        </p>
      </div>
    </PageShell>
  )
}

// ── Success card ──────────────────────────────────────────────────────────────
function SuccessCard({ message, isAr }: { message: string; isAr: boolean }) {
  return (
    <PageShell>
      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-8 text-center space-y-4">
        <div className="text-4xl">✓</div>
        <p className={`text-sm text-brand-dark ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
          {message}
        </p>
      </div>
    </PageShell>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
function SignupInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get('token') ?? ''

  const [lang,        setLang]        = useState<Lang>('en')
  const [tokenState,  setTokenState]  = useState<'loading' | 'valid' | 'invalid' | 'expired'>('loading')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [formError,   setFormError]   = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [success,     setSuccess]     = useState(false)

  const t    = copy[lang]
  const isAr = lang === 'ar'

  // Validate token on mount
  useEffect(() => {
    if (!token || !UUID_PATTERN.test(token)) {
      setTokenState('invalid')
      return
    }

    const validate = async () => {
      const supabase = createAnonClient()
      const { data, error } = await supabase
        .from('patients')
        .select('invite_status, invite_token_expires_at, preferred_language, contact_method, contact_value')
        .eq('invite_token', token)
        .maybeSingle()

      if (error || !data)                                           { setTokenState('invalid'); return }
      if (data.invite_status === 'active')                         { router.replace('/patient/home'); return }
      if (new Date(data.invite_token_expires_at) < new Date())     { setTokenState('expired'); return }

      setLang((data.preferred_language as Lang) ?? 'en')
      if (data.contact_method === 'email' && data.contact_value) {
        setEmail(data.contact_value)
      }
      setTokenState('valid')
    }

    validate()
  }, [token, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (password.length < 8) {
      setFormError(isAr ? 'كلمة المرور قصيرة جداً' : 'Password must be at least 8 characters.')
      return
    }

    setSubmitting(true)
    const supabase = createAnonClient()

    // 1. Create Supabase Auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })

    if (authError || !authData.user) {
      setFormError(t.errGeneric)
      setSubmitting(false)
      return
    }

    // 2. Link user to patient row via server-side admin client (bypasses RLS)
    const res = await fetch('/api/patient/activate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token, userId: authData.user.id }),
    })

    if (!res.ok) {
      setFormError(t.errGeneric)
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.replace('/patient/home'), 1200)
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (tokenState === 'loading') {
    return (
      <PageShell>
        <p className="text-center font-dm-sans text-sm text-gray-400">
          Checking your invite…
        </p>
      </PageShell>
    )
  }

  if (tokenState === 'invalid') return <ErrorCard message={t.errInvalid} isAr={isAr} />
  if (tokenState === 'expired') return <ErrorCard message={t.errExpired} isAr={isAr} />
  if (success)                  return <SuccessCard message={t.success}  isAr={isAr} />

  return (
    <PageShell>
      <div
        dir={isAr ? 'rtl' : undefined}
        lang={isAr ? 'ar' : undefined}
        className="bg-white rounded-card border border-gray-100 shadow-sm p-8 space-y-6"
      >
        {/* Heading */}
        <div className="space-y-2">
          <h1 className="font-playfair text-2xl text-gray-900 leading-snug">
            {t.heading}
          </h1>
          <p className={`text-sm text-gray-500 leading-relaxed ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
            {t.sub}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <div className="space-y-2">
            <label className={`block text-sm font-semibold text-gray-700 ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
              {t.emailLabel}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              className={`w-full px-4 py-3.5 border border-gray-200 rounded-btn text-gray-900 text-base
                          focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-transparent
                          ${isAr ? 'font-tajawal text-right' : 'font-dm-sans'}`}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className={`block text-sm font-semibold text-gray-700 ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
              {t.passLabel}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                className={`w-full px-4 py-3.5 border border-gray-200 rounded-btn text-gray-900 text-base
                            focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-transparent
                            ${isAr ? 'font-tajawal pr-4 pl-16' : 'font-dm-sans pr-16'}`}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className={`absolute top-1/2 -translate-y-1/2 text-xs font-semibold text-brand-mid
                            font-dm-sans cursor-pointer bg-transparent border-none p-0
                            ${isAr ? 'left-4' : 'right-4'}`}
              >
                {showPass ? t.hide : t.show}
              </button>
            </div>
            <p className={`text-xs text-gray-400 ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
              {t.passHint}
            </p>
          </div>

          {/* Error message */}
          {formError && (
            <p className={`text-sm text-red-700 bg-red-50 px-3.5 py-2.5 rounded-btn
                           ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
              {formError}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-4 rounded-btn text-white text-base font-semibold transition-opacity
                        ${submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-dark hover:opacity-90 cursor-pointer'}
                        ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}
          >
            {submitting ? t.submitting : t.submit}
          </button>

        </form>
      </div>
    </PageShell>
  )
}

// ── Page export — Suspense required for useSearchParams in Next.js 14 ─────────
export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p className="font-dm-sans text-sm text-gray-400">Loading…</p>
      </div>
    }>
      <SignupInner />
    </Suspense>
  )
}
