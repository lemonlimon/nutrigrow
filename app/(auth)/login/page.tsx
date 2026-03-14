import LoginForm from '@/components/auth/LoginForm'

// ── Shared Islamic geometric SVG pattern — used on desktop left panel AND
// mobile banner. Each instance uses a unique pattern ID to avoid conflicts
// (both elements are in the DOM simultaneously, just one hidden via CSS).
// Geometry: 8-pointed star (khatam) in a 120×120 seamlessly-tiling unit.
// ─────────────────────────────────────────────────────────────────────────────
function IslamicPatternSVG({ id, strokeColor }: { id: string; strokeColor: string }) {
  return (
    <svg
      className="islamic-rotate"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern id={id} patternUnits="userSpaceOnUse" width="120" height="120">
          <g stroke={strokeColor} strokeWidth="0.7" fill="none">
            {/* 8-pointed star: outer R=42, inner r=17.4 */}
            <path d="M 60,18 L 66.7,43.9 L 89.7,30.3 L 76.1,53.4 L 102,60
                     L 76.1,66.7 L 89.7,89.7 L 66.7,76.1 L 60,102
                     L 53.4,76.1 L 30.3,89.7 L 43.9,66.7 L 18,60
                     L 43.9,53.4 L 30.3,30.3 L 53.4,43.9 Z" />
            {/* Inner octagon */}
            <path d="M 66.7,43.9 L 76.1,53.4 L 76.1,66.7 L 66.7,76.1
                     L 53.4,76.1 L 43.9,66.7 L 43.9,53.4 L 53.4,43.9 Z" />
            {/* N band */}
            <line x1="53.4" y1="43.9" x2="53.4" y2="0" />
            <line x1="60"   y1="18"   x2="60"   y2="0" />
            <line x1="66.7" y1="43.9" x2="66.7" y2="0" />
            {/* NE band */}
            <line x1="66.7" y1="43.9" x2="110.6" y2="0"   />
            <line x1="89.7" y1="30.3" x2="120"   y2="0"   />
            <line x1="76.1" y1="53.4" x2="120"   y2="9.5" />
            {/* E band */}
            <line x1="76.1" y1="53.4" x2="120" y2="53.4" />
            <line x1="102"  y1="60"   x2="120" y2="60"   />
            <line x1="76.1" y1="66.7" x2="120" y2="66.7" />
            {/* SE band */}
            <line x1="76.1" y1="66.7" x2="120"   y2="110.6" />
            <line x1="89.7" y1="89.7" x2="120"   y2="120"   />
            <line x1="66.7" y1="76.1" x2="110.6" y2="120"   />
            {/* S band */}
            <line x1="66.7" y1="76.1" x2="66.7" y2="120" />
            <line x1="60"   y1="102"  x2="60"   y2="120" />
            <line x1="53.4" y1="76.1" x2="53.4" y2="120" />
            {/* SW band */}
            <line x1="53.4" y1="76.1" x2="9.5" y2="120"   />
            <line x1="30.3" y1="89.7" x2="0"   y2="120"   />
            <line x1="43.9" y1="66.7" x2="0"   y2="110.6" />
            {/* W band */}
            <line x1="43.9" y1="66.7" x2="0" y2="66.7" />
            <line x1="18"   y1="60"   x2="0" y2="60"   />
            <line x1="43.9" y1="53.4" x2="0" y2="53.4" />
            {/* NW band */}
            <line x1="43.9" y1="53.4" x2="0"   y2="9.5" />
            <line x1="30.3" y1="30.3" x2="0"   y2="0"   />
            <line x1="53.4" y1="43.9" x2="9.5" y2="0"   />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <>
      {/* Tajawal via Google Fonts */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500&display=swap"
      />

      {/* Animation keyframes */}
      <style>{`
        /* Breathing for desktop left panel */
        @keyframes islamicBreathe {
          from { opacity: 0.30; }
          to   { opacity: 0.65; }
        }
        .islamic-breathe {
          position: absolute;
          inset: 0;
          animation: islamicBreathe 8s ease-in-out infinite alternate;
        }

        /* Breathing for mobile banner (slightly tighter range on green bg) */
        @keyframes islamicBreatheMobile {
          from { opacity: 0.20; }
          to   { opacity: 0.45; }
        }
        .islamic-breathe-mobile {
          position: absolute;
          inset: 0;
          animation: islamicBreatheMobile 8s ease-in-out infinite alternate;
        }

        /* Shared slow rotation */
        @keyframes islamicRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .islamic-rotate {
          position: absolute;
          top: -30%;
          left: -30%;
          width: 160%;
          height: 160%;
          transform-origin: 50% 50%;
          animation: islamicRotate 120s linear infinite;
        }
      `}</style>

      {/*
        Layout:
        Mobile  (<md): column flex — left panel hidden, mobile banner then form
        Desktop (≥md): row flex — left 60% pattern panel + right 40% form
      */}
      <main
        className="flex flex-col md:flex-row md:h-screen md:overflow-hidden"
        style={{ minHeight: '100vh' }}
      >

        {/* ── LEFT: desktop pattern panel — hidden on mobile ────────────── */}
        <div
          className="hidden md:block relative flex-shrink-0"
          style={{ width: '60%', background: '#0a1628', overflow: 'hidden' }}
        >
          <div className="islamic-breathe">
            <IslamicPatternSVG id="islamicPattern" strokeColor="#1D9E75" />
          </div>

          {/* Dark gradient overlay */}
          <div
            style={{
              position:   'absolute',
              inset:      0,
              background: 'linear-gradient(to bottom, rgba(10,22,40,0.55), rgba(10,22,40,0.75))',
            }}
          />

          {/* Brand copy — bottom-left */}
          <div style={{ position: 'absolute', bottom: 48, left: 48, zIndex: 2 }}>
            <span style={{
              display:       'block',
              fontFamily:    'var(--font-playfair), Playfair Display, Georgia, serif',
              fontSize:      64,
              fontWeight:    700,
              color:         '#ffffff',
              letterSpacing: '0.15em',
              lineHeight:    1,
            }}>
              MIZAN
            </span>
            <span style={{
              display:    'block',
              fontFamily: 'Tajawal, sans-serif',
              fontSize:   24,
              color:      '#1D9E75',
              marginTop:  6,
            }}>
              ميزان
            </span>
            <div style={{
              marginTop:  40, width: 48, height: 1,
              background: 'rgba(29,158,117,0.5)',
            }} />
            <p style={{
              marginTop:     16,
              fontFamily:    'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
              fontSize:      12,
              color:         'rgba(255,255,255,0.6)',
              textTransform: 'uppercase',
              letterSpacing: '0.25em',
            }}>
              Precision Weight Management
            </p>
          </div>
        </div>

        {/* ── RIGHT: form panel ─────────────────────────────────────────── */}
        {/*
          Mobile:  flex-col, bg-canvas, flows naturally (banner → form content)
          Desktop: flex centering, bg-white, scrollable
        */}
        <div
          className="flex-1 flex flex-col bg-canvas md:bg-white
                     md:justify-center md:items-center md:overflow-y-auto"
        >

          {/* ── MOBILE BANNER — hidden on desktop ───────────────────────── */}
          <div
            className="md:hidden relative overflow-hidden flex-shrink-0"
            style={{ background: '#0D5C45', padding: '40px 32px 32px' }}
          >
            {/* Pattern — green-on-green shimmer */}
            <div className="islamic-breathe-mobile">
              <IslamicPatternSVG id="islamicPatternMobile" strokeColor="rgba(255,255,255,0.45)" />
            </div>

            {/* Brand copy — above pattern */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <span style={{
                display:       'block',
                fontFamily:    'var(--font-playfair), Playfair Display, Georgia, serif',
                fontSize:      42,
                fontWeight:    700,
                color:         '#ffffff',
                letterSpacing: '10px',
                lineHeight:    1,
              }}>
                MIZAN
              </span>
              <span style={{
                display:    'block',
                fontFamily: 'Tajawal, sans-serif',
                fontSize:   18,
                color:      '#E8F5F0',
                marginTop:  4,
              }}>
                ميزان
              </span>
              <div style={{
                width: 40, height: 1,
                background: 'rgba(255,255,255,0.4)',
                margin: '12px 0',
              }} />
              <p style={{
                fontFamily:    'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
                fontSize:      10,
                color:         'rgba(255,255,255,0.55)',
                textTransform: 'uppercase',
                letterSpacing: '3px',
                margin:        0,
              }}>
                Precision Weight Management
              </p>
            </div>
          </div>

          {/* ── FORM CONTENT ──────────────────────────────────────────────── */}
          {/*
            Mobile:  padding-top 32px below the banner, left/right 32px
            Desktop: already centered by parent flex; no extra top padding
          */}
          <div
            className="w-full px-8 pt-8 pb-12 md:py-0 md:px-8"
            style={{ maxWidth: 360 }}
          >
            {/* "Welcome back" — FIX 1: "M" logo mark removed, form starts here */}
            <h1
              style={{
                fontFamily:   'var(--font-playfair), Playfair Display, Georgia, serif',
                fontSize:     36,
                fontWeight:   400,
                color:        '#1a1a1a',
                lineHeight:   1.1,
                marginBottom: 10,
              }}
            >
              Welcome back
            </h1>

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

            {/* Auth logic — untouched */}
            <LoginForm />
          </div>

        </div>
      </main>
    </>
  )
}
