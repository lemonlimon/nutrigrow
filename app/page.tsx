// Root landing page — routes clinicians to /login, patients to /patient/login
// Server component — no auth logic needed
import Link from 'next/link'

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconPerson({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 18 18" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="6" r="3" />
      <path d="M3 15.5c0-3.314 2.686-5.5 6-5.5s6 2.186 6 5.5" />
    </svg>
  )
}

function IconHeart({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 18 18" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 14.5S2.5 10.5 2.5 6.5a3.5 3.5 0 0 1 6.5-1.8A3.5 3.5 0 0 1 15.5 6.5c0 4-6.5 8-6.5 8Z" />
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500&display=swap"
      />

      <main
        className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
        style={{ background: '#FAFAF8' }}
      >
        <div style={{ maxWidth: 900, width: '100%' }}>

          {/* ── Branding ──────────────────────────────────────────────────── */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h1
              style={{
                fontFamily:    'var(--font-playfair), Playfair Display, Georgia, serif',
                fontSize:      52,
                fontWeight:    700,
                color:         '#0D5C45',
                letterSpacing: '10px',
                lineHeight:    1,
                margin:        0,
              }}
            >
              MIZAN
            </h1>

            <p
              style={{
                fontFamily: 'Tajawal, sans-serif',
                fontSize:   20,
                color:      '#1D9E75',
                marginTop:  4,
                marginBottom: 0,
              }}
            >
              ميزان
            </p>

            <p
              style={{
                fontFamily:    'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
                fontSize:      12,
                color:         '#999',
                textTransform: 'uppercase',
                letterSpacing: '3px',
                marginTop:     8,
              }}
            >
              Precision Weight Management
            </p>

            {/* Accent rule */}
            <div
              style={{
                width:      48,
                height:     1,
                background: 'rgba(29,158,117,0.4)',
                margin:     '24px auto 0',
              }}
            />
          </div>

          {/* ── Two cards ─────────────────────────────────────────────────── */}
          <div
            className="flex flex-col md:flex-row"
            style={{ gap: 24 }}
          >

            {/* CARD 2 — Patient */}
            <div
              className="flex-1"
              style={{
                background:   '#ffffff',
                borderRadius: 16,
                border:       '1px solid #e8e8e8',
                padding:      36,
                display:      'flex',
                flexDirection:'column',
              }}
            >
              <IconHeart color="#1D9E75" />

              <h2
                style={{
                  fontFamily:  'var(--font-playfair), Playfair Display, Georgia, serif',
                  fontSize:    22,
                  fontWeight:  600,
                  color:       '#1a1a1a',
                  marginTop:   12,
                  marginBottom: 0,
                }}
              >
                I&rsquo;m a patient
              </h2>

              <p
                style={{
                  fontFamily:   'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
                  fontSize:     13,
                  color:        '#666',
                  marginTop:    6,
                  marginBottom: 28,
                  lineHeight:   1.5,
                  flexGrow:     1,
                }}
              >
                Log your meals, track your weight, check in weekly
              </p>

              <Link
                href="/patient/login"
                style={{
                  display:        'block',
                  width:          '100%',
                  height:         48,
                  background:     '#ffffff',
                  borderRadius:   12,
                  border:         '1.5px solid #0D5C45',
                  color:          '#0D5C45',
                  fontFamily:     'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
                  fontSize:       14,
                  fontWeight:     600,
                  textAlign:      'center',
                  lineHeight:     '45px',
                  textDecoration: 'none',
                  transition:     'background 200ms',
                  boxSizing:      'border-box',
                }}
              >
                Go to My Home
              </Link>
            </div>

            {/* CARD 1 — Clinician */}
            <div
              className="flex-1"
              style={{
                background:   '#ffffff',
                borderRadius: 16,
                border:       '1px solid #e8e8e8',
                padding:      36,
                display:      'flex',
                flexDirection:'column',
              }}
            >
              <IconPerson color="#0D5C45" />

              <h2
                style={{
                  fontFamily:  'var(--font-playfair), Playfair Display, Georgia, serif',
                  fontSize:    22,
                  fontWeight:  600,
                  color:       '#1a1a1a',
                  marginTop:   12,
                  marginBottom: 0,
                }}
              >
                I&rsquo;m a clinician
              </h2>

              <p
                style={{
                  fontFamily:   'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
                  fontSize:     13,
                  color:        '#666',
                  marginTop:    6,
                  marginBottom: 28,
                  lineHeight:   1.5,
                  flexGrow:     1,
                }}
              >
                Manage your patients and view weekly digests
              </p>

              <Link
                href="/login"
                style={{
                  display:        'block',
                  width:          '100%',
                  height:         48,
                  background:     '#0D5C45',
                  borderRadius:   12,
                  border:         'none',
                  color:          '#fff',
                  fontFamily:     'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
                  fontSize:       14,
                  fontWeight:     600,
                  textAlign:      'center',
                  lineHeight:     '48px',
                  textDecoration: 'none',
                  transition:     'opacity 200ms',
                }}
              >
                Sign In to Dashboard
              </Link>
            </div>

          </div>
        </div>
      </main>
    </>
  )
}
