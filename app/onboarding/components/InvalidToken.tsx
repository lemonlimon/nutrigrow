'use client'

/** Shown when the invite token is invalid, expired or already used. */

export default function InvalidToken() {
  return (
    <div style={{
      minHeight:      '100svh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        24,
      background:     '#fff',
    }}>
      <div style={{
        maxWidth:     360,
        textAlign:    'center',
        padding:      '40px 32px',
        background:   '#FAFAF8',
        borderRadius: 20,
        border:       '1px solid #F0F0F0',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>

        <h2 style={{
          fontFamily: 'var(--font-playfair)',
          fontSize:   24,
          color:      '#1A1A1A',
          marginBottom: 12,
          lineHeight: 1.3,
        }}>
          Link expired
        </h2>

        <p style={{
          fontFamily: 'var(--font-dm-sans)',
          fontSize:   15,
          color:      '#6B6B6B',
          lineHeight: 1.6,
          marginBottom: 28,
        }}>
          This invite link has expired or has already been used.
          Please contact your clinic for a new link.
        </p>

        <a
          href="/"
          style={{
            display:        'inline-block',
            padding:        '12px 28px',
            background:     '#1A1A1A',
            color:          '#fff',
            borderRadius:   100,
            fontFamily:     'var(--font-dm-sans)',
            fontSize:       14,
            fontWeight:     600,
            textDecoration: 'none',
          }}
        >
          Go to homepage
        </a>
      </div>
    </div>
  )
}
