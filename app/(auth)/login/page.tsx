import LoginForm from '@/components/auth/LoginForm'

// ── Split-screen clinic login — ro.co / joinmochi aesthetic ─────────────────
// Left (60%): full-height video background + overlay + brand copy
// Right (40%): pure white, centered form — full screen on mobile
export default function LoginPage() {
  return (
    <>
      {/* Tajawal via Google Fonts */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500&display=swap"
      />

      <main style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* ── LEFT: video panel — desktop only ──────────────────────────── */}
        <div
          className="hidden md:block relative flex-shrink-0"
          style={{ width: '60%' }}
        >
          {/* Video */}
          <video
            autoPlay
            muted
            loop
            playsInline
            src="/login-bg.mp4"
            style={{
              position:   'absolute',
              inset:      0,
              width:      '100%',
              height:     '100%',
              objectFit:  'cover',
            }}
          />

          {/* Dark gradient overlay */}
          <div
            style={{
              position:   'absolute',
              inset:      0,
              background: 'linear-gradient(to bottom, rgba(10,22,40,0.5), rgba(10,22,40,0.7))',
            }}
          />

          {/* Brand copy — bottom-left */}
          <div style={{ position: 'absolute', bottom: 48, left: 48 }}>
            <span
              style={{
                display:      'block',
                fontFamily:   'var(--font-playfair), Playfair Display, Georgia, serif',
                fontSize:     64,
                fontWeight:   700,
                color:        '#ffffff',
                letterSpacing: '0.15em',
                lineHeight:   1,
              }}
            >
              MIZAN
            </span>

            <span
              style={{
                display:    'block',
                fontFamily: 'Tajawal, sans-serif',
                fontSize:   24,
                color:      '#1D9E75',
                marginTop:  6,
              }}
            >
              ميزان
            </span>

            {/* Thin accent line */}
            <div
              style={{
                marginTop:  40,
                width:      48,
                height:     1,
                background: 'rgba(29,158,117,0.6)',
              }}
            />

            <p
              style={{
                marginTop:     16,
                fontFamily:    'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
                fontSize:      12,
                color:         'rgba(255,255,255,0.6)',
                textTransform: 'uppercase',
                letterSpacing: '0.25em',
              }}
            >
              Precision Weight Management
            </p>
          </div>
        </div>

        {/* ── RIGHT: form panel ─────────────────────────────────────────── */}
        <div
          className="flex-1"
          style={{
            background:     '#ffffff',
            display:        'flex',
            flexDirection:  'column',
            justifyContent: 'center',
            alignItems:     'center',
            height:         '100vh',
            overflowY:      'auto',
          }}
        >
          <div
            style={{
              maxWidth: 360,
              width:    '100%',
              padding:  '0 32px',
            }}
          >
            {/* Mobile-only branding — hidden on desktop */}
            <div className="md:hidden" style={{ marginBottom: 40, textAlign: 'center' }}>
              <span
                style={{
                  display:    'block',
                  fontFamily: 'var(--font-playfair), Playfair Display, Georgia, serif',
                  fontSize:   36,
                  fontWeight: 700,
                  color:      '#0D5C45',
                  lineHeight: 1,
                }}
              >
                MIZAN
              </span>
              <span
                style={{
                  display:    'block',
                  fontFamily: 'Tajawal, sans-serif',
                  fontSize:   16,
                  color:      '#1D9E75',
                  marginTop:  4,
                }}
              >
                ميزان
              </span>
            </div>

            {/* Logo mark */}
            <p
              style={{
                fontFamily:   'var(--font-playfair), Playfair Display, Georgia, serif',
                fontSize:     28,
                fontWeight:   700,
                color:        '#0D5C45',
                marginBottom: 32,
                lineHeight:   1,
              }}
            >
              M
            </p>

            {/* Heading */}
            <h1
              style={{
                fontFamily:  'var(--font-playfair), Playfair Display, Georgia, serif',
                fontSize:    36,
                fontWeight:  400,
                color:       '#1a1a1a',
                lineHeight:  1.1,
                marginBottom: 10,
              }}
            >
              Welcome back
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontFamily:   'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
                fontSize:     14,
                color:        '#999',
                marginBottom: 40,
              }}
            >
              Sign in to your dashboard
            </p>

            {/* ── Form fields — all auth logic lives here ── */}
            <LoginForm />

          </div>
        </div>

      </main>
    </>
  )
}
