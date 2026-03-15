'use client'

import { useState }     from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Role-based routing — window.location.href for a hard navigation
    // so session cookies are fully committed before the next page loads
    const userId = authData.user?.id
    if (userId) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)

      const isAdmin  = roles?.some(r => r.role === 'admin')
      const isClinic = roles?.some(r => r.role === 'clinic')

      if (isAdmin || isClinic) {
        window.location.href = '/dashboard'
        return
      }
    }

    window.location.href = '/patient/home'
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = {
    display:       'block',
    fontFamily:    'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
    fontSize:      12,
    fontWeight:    500,
    color:         '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom:  6,
  }

  const inputStyle: React.CSSProperties = {
    display:      'block',
    width:        '100%',
    height:       48,
    border:       '1.5px solid #e8e8e8',
    borderRadius: 10,
    padding:      '0 16px',
    fontFamily:   'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
    fontSize:     15,
    color:        '#1a1a1a',
    background:   '#fff',
    outline:      'none',
    boxSizing:    'border-box',
    transition:   'border-color 150ms',
  }

  return (
    <form onSubmit={handleSubmit}>

      {/* Email */}
      <div>
        <label htmlFor="email" style={labelStyle}>Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={inputStyle}
          onFocus={(e)  => { e.currentTarget.style.borderColor = '#0D5C45' }}
          onBlur={(e)   => { e.currentTarget.style.borderColor = '#e8e8e8' }}
        />
      </div>

      {/* Password */}
      <div style={{ marginTop: 20 }}>
        <label htmlFor="password" style={labelStyle}>Password</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={inputStyle}
          onFocus={(e)  => { e.currentTarget.style.borderColor = '#0D5C45' }}
          onBlur={(e)   => { e.currentTarget.style.borderColor = '#e8e8e8' }}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop:      32,
          display:        'block',
          width:          '100%',
          height:         52,
          background:     loading ? '#0a4a35' : '#0D5C45',
          borderRadius:   12,
          border:         'none',
          color:          '#fff',
          fontFamily:     'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
          fontSize:       15,
          fontWeight:     600,
          letterSpacing:  '0.02em',
          cursor:         loading ? 'not-allowed' : 'pointer',
          opacity:        loading ? 0.85 : 1,
          transition:     'background 200ms, opacity 200ms',
        }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#0a4a35' }}
        onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#0D5C45' }}
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      {/* Error — shown below button */}
      {error && (
        <p
          style={{
            marginTop:  12,
            fontFamily: 'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
            fontSize:   13,
            color:      '#B94040',
          }}
        >
          {error}
        </p>
      )}


    </form>
  )
}
