'use client'

import { useOnboarding } from '../context/OnboardingContext'

interface Props {
  onNext: () => void
  onBack: () => void
}

export default function Step14Exercise({ onNext, onBack: _onBack }: Props) {
  const { update } = useOnboarding()

  function handleSelect(value: boolean) {
    update({ add_exercise_calories: value })
    onNext()
  }

  return (
    <div style={{ padding: '24px 20px', fontFamily: 'var(--font-dm-sans)' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A', marginBottom: 24 }}>
        Add calories burned back to your daily goal?
      </h1>

      {/* Floating card */}
      <div style={{
        background:    '#F5F5F5',
        borderRadius:  16,
        padding:       20,
        marginBottom:  28,
        position:      'relative',
      }}>
        {/* Image placeholder */}
        <div style={{
          borderRadius: 8,
          height:       120,
          background:   '#E0E0E0',
          marginBottom: 16,
        }} />

        <p style={{ fontSize: 13, color: '#6B6B6B', margin: '0 0 6px 0', fontFamily: 'var(--font-dm-sans)' }}>
          Today&apos;s Goal:
        </p>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', margin: '0 0 8px 0', fontFamily: 'var(--font-dm-sans)' }}>
          🔥 500 Cals
        </p>
        <p style={{ fontSize: 14, color: '#4A9EFF', margin: 0, fontFamily: 'var(--font-dm-sans)' }}>
          🏃 Running: +100 cals
        </p>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={() => handleSelect(false)}
          style={{
            width:        '100%',
            height:       52,
            borderRadius: 100,
            border:       '1.5px solid #E0E0E0',
            background:   'transparent',
            color:        '#1A1A1A',
            fontSize:     16,
            fontWeight:   600,
            fontFamily:   'var(--font-dm-sans)',
            cursor:       'pointer',
          }}
        >
          No
        </button>
        <button
          onClick={() => handleSelect(true)}
          style={{
            width:        '100%',
            height:       52,
            borderRadius: 100,
            border:       'none',
            background:   '#1A1A1A',
            color:        '#fff',
            fontSize:     16,
            fontWeight:   600,
            fontFamily:   'var(--font-dm-sans)',
            cursor:       'pointer',
          }}
        >
          Yes
        </button>
      </div>
    </div>
  )
}
