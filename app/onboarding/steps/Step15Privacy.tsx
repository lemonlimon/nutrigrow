'use client'

import { useOnboarding } from '../context/OnboardingContext'

interface Props {
  onNext: () => void
  onBack: () => void
}

export default function Step15Privacy({ onNext: _onNext, onBack: _onBack }: Props) {
  const { data: _data } = useOnboarding()

  return (
    <div style={{
      padding:        '40px 24px',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      fontFamily:     'var(--font-dm-sans)',
    }}>
      <div style={{ fontSize: 80, textAlign: 'center', marginBottom: 24 }}>
        👋
      </div>

      <h1 style={{
        fontSize:    26,
        fontWeight:  700,
        color:       '#1A1A1A',
        textAlign:   'center',
        marginBottom: 12,
        fontFamily:  'var(--font-dm-sans)',
      }}>
        Thank you for trusting us
      </h1>

      <p style={{
        fontSize:     15,
        color:        '#6B6B6B',
        textAlign:    'center',
        marginBottom: 32,
        lineHeight:   1.6,
      }}>
        Now let&apos;s personalize MIZAN for you...
      </p>

      {/* Trust badge */}
      <div style={{
        background:    '#F5F5F5',
        borderRadius:  12,
        padding:       '12px 16px',
        display:       'flex',
        flexDirection: 'row',
        alignItems:    'flex-start',
        gap:           12,
        width:         '100%',
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>🔒</span>
        <p style={{
          fontSize:   13,
          color:      '#6B6B6B',
          lineHeight: 1.5,
          margin:     0,
          fontFamily: 'var(--font-dm-sans)',
        }}>
          Your privacy and security matter to us. We promise to always keep your personal data safe.
        </p>
      </div>
    </div>
  )
}
