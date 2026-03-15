'use client'

import { useOnboarding } from '../context/OnboardingContext'

interface Props {
  onNext: () => void
  onBack: () => void
}

export default function Step7Validation({ onNext, onBack }: Props) {
  const { data } = useOnboarding()

  const unit      = data.unit === 'imperial' ? 'lbs' : 'kg'
  const target    = data.target_weight ?? data.current_weight
  const diff      = Math.abs(data.current_weight - target)

  return (
    <div style={{
      padding:        '40px 24px',
      fontFamily:     'var(--font-dm-sans)',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      minHeight:      '100%',
    }}>
      <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 28 }}>🎯</div>

      <h1 style={{
        fontSize:   26,
        fontWeight: 700,
        color:      '#1A1A1A',
        textAlign:  'center',
        lineHeight: 1.35,
        marginBottom: 20,
      }}>
        Losing{' '}
        <span style={{ color: '#F5A623' }}>
          {diff} {unit}
        </span>
        {' '}is a realistic target.
        <br />
        It&apos;s not hard at all!
      </h1>

      <p style={{
        fontSize:   15,
        color:      '#6B6B6B',
        textAlign:  'center',
        maxWidth:   300,
        lineHeight: 1.55,
        marginBottom: 48,
      }}>
        90% of users say that the change is obvious after using MIZAN and it is
        not easy to rebound.
      </p>

      <button
        onClick={onNext}
        style={{
          width:        '100%',
          maxWidth:     340,
          height:       56,
          borderRadius: 14,
          border:       'none',
          background:   '#1A1A1A',
          color:        '#FFFFFF',
          fontSize:     16,
          fontWeight:   600,
          fontFamily:   'var(--font-dm-sans)',
          cursor:       'pointer',
        }}
      >
        Continue
      </button>

      <button
        onClick={onBack}
        style={{
          width:      '100%',
          maxWidth:   340,
          height:     48,
          marginTop:  12,
          border:     'none',
          background: 'transparent',
          color:      '#6B6B6B',
          fontSize:   15,
          fontFamily: 'var(--font-dm-sans)',
          cursor:     'pointer',
        }}
      >
        Back
      </button>
    </div>
  )
}
