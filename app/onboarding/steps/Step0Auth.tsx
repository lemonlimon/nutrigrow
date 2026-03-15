'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useOnboarding } from '../context/OnboardingContext'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type View = 'main' | 'email_input' | 'otp_input'

const pillBase: React.CSSProperties = {
  width: '100%', height: 52, borderRadius: 100,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 10, fontSize: 16, fontWeight: 600,
  fontFamily: 'var(--font-dm-sans)', cursor: 'pointer', border: 'none', outline: 'none',
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 52, borderRadius: 100,
  border: '1.5px solid #E0E0E0', padding: '0 20px',
  fontSize: 15, fontFamily: 'var(--font-dm-sans)',
  color: '#1A1A1A', outline: 'none', boxSizing: 'border-box', background: '#fff',
}

export default function Step0Auth({ onNext, onBack: _onBack }: { onNext: () => void; onBack: () => void }) {
  const { data } = useOnboarding()

  const [view, setView]         = useState<View>('main')
  const [email, setEmail]       = useState('')
  const [otp, setOtp]           = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // ── MODE A: Invited ───────────────────────────────────────────────────────
  if (data.mode === 'invited') {
    const handleCreateAccount = async () => {
      setError(null)
      if (!password || password !== confirm) { setError('Passwords do not match.'); return }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
      setLoading(true)
      const { error: err } = await supabase.auth.signUp({ email: data.prefilledEmail ?? '', password })
      setLoading(false)
      if (err) { setError(err.message); return }
      onNext()
    }

    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px', fontFamily: 'var(--font-dm-sans)' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A', marginBottom: 8, fontFamily: 'var(--font-playfair)' }}>
          Set up your account
        </h1>
        <p style={{ fontSize: 14, color: '#6B6B6B', margin: '0 0 32px' }}>Your clinic has invited you to MIZAN</p>

        <div style={{ width: '100%', height: 52, borderRadius: 100, background: '#F5F5F5', display: 'flex', alignItems: 'center', padding: '0 20px', fontSize: 15, color: '#9A9A9A', marginBottom: 12, boxSizing: 'border-box', fontFamily: 'var(--font-dm-sans)' }}>
          {data.prefilledEmail ?? ''}
        </div>

        <input type="password" placeholder="Password"         value={password} onChange={e => setPassword(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
        <input type="password" placeholder="Confirm password" value={confirm}  onChange={e => setConfirm(e.target.value)}  style={{ ...inputStyle, marginBottom: 16 }} />

        {error && <p style={{ color: '#E53E3E', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>{error}</p>}

        <button onClick={handleCreateAccount} disabled={loading} style={{ ...pillBase, background: loading ? '#888' : '#1A1A1A', color: '#fff' }}>
          {loading ? 'Creating account…' : 'Create account →'}
        </button>
      </div>
    )
  }

  // ── MODE B: Direct ────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setLoading(true); setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback?next=/onboarding' },
    })
    if (err) { setError(err.message); setLoading(false) }
  }

  const handleSendCode = async () => {
    if (!email) { setError('Please enter your email.'); return }
    setError(null); setLoading(true)
    const { error: err } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    setLoading(false)
    if (err) { setError(err.message); return }
    setView('otp_input')
  }

  const handleVerifyOtp = async () => {
    if (!otp) { setError('Please enter the 6-digit code.'); return }
    setError(null); setLoading(true)
    const { error: err } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    setLoading(false)
    if (err) { setError(err.message); return }
    onNext()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '60px 20px 32px', fontFamily: 'var(--font-dm-sans)' }}>
      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A1A1A', textAlign: 'center', marginBottom: 32, fontFamily: 'var(--font-playfair)' }}>
          Sign In
        </h1>

        <button onClick={handleGoogleSignIn} disabled={loading} style={{ ...pillBase, background: '#1A1A1A', color: '#fff', marginBottom: 12 }}>
          <GoogleSvg />
          Sign in with Google
        </button>

        {view === 'main' && (
          <button onClick={() => setView('email_input')} style={{ ...pillBase, background: '#fff', color: '#1A1A1A', border: '1.5px solid #E0E0E0' }}>
            <EnvelopeSvg />
            Continue with email
          </button>
        )}

        {view === 'email_input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
            <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} autoFocus />
            <button onClick={handleSendCode} disabled={loading} style={{ ...pillBase, background: loading ? '#888' : '#1A1A1A', color: '#fff' }}>
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </div>
        )}

        {view === 'otp_input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
            <p style={{ fontSize: 14, color: '#6B6B6B', textAlign: 'center', margin: 0 }}>Enter the 6-digit code sent to {email}</p>
            <input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} style={{ ...inputStyle, textAlign: 'center', letterSpacing: 8, fontSize: 20 }} autoFocus />
            <button onClick={handleVerifyOtp} disabled={loading} style={{ ...pillBase, background: loading ? '#888' : '#1A1A1A', color: '#fff' }}>
              {loading ? 'Verifying…' : 'Verify'}
            </button>
          </div>
        )}

        {error && <p style={{ color: '#E53E3E', fontSize: 14, marginTop: 12, textAlign: 'center' }}>{error}</p>}
      </div>

      <p style={{ fontSize: 12, color: '#9A9A9A', textAlign: 'center', marginTop: 32, lineHeight: 1.5 }}>
        By continuing you agree to MIZAN&apos;s Terms and Conditions and Privacy Policy
      </p>
    </div>
  )
}

function GoogleSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

function EnvelopeSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="3" stroke="#1A1A1A" strokeWidth="1.8"/>
      <path d="M2 7l10 7 10-7" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}
