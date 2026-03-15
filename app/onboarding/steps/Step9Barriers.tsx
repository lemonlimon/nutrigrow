'use client'

import { useOnboarding } from '../context/OnboardingContext'

interface Props {
  onNext: () => void
  onBack: () => void
}

interface BarrierOption {
  emoji: string
  label: string
  value: string
}

const OPTIONS: BarrierOption[] = [
  { emoji: '📊', label: 'Lack of consistency',      value: 'lack_of_consistency'    },
  { emoji: '🍔', label: 'Unhealthy eating habits',  value: 'unhealthy_eating'       },
  { emoji: '🤝', label: 'Lack of support',          value: 'lack_of_support'        },
  { emoji: '📅', label: 'Busy schedule',            value: 'busy_schedule'          },
  { emoji: '🍽️', label: 'Lack of meal inspiration', value: 'lack_of_meal_inspiration' },
]

export default function Step9Barriers({ onNext, onBack }: Props) {
  const { data, update } = useOnboarding()

  function toggleBarrier(value: string) {
    const next = data.barriers.includes(value)
      ? data.barriers.filter((b) => b !== value)
      : [...data.barriers, value]
    update({ barriers: next })
  }

  const canContinue = data.barriers.length > 0

  return (
    <div style={{ padding: '24px 20px', fontFamily: 'var(--font-dm-sans)' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A', marginBottom: 24 }}>
        What&apos;s stopping you from reaching your goals?
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {OPTIONS.map((opt) => {
          const selected = data.barriers.includes(opt.value)
          return (
            <button
              key={opt.value}
              onClick={() => toggleBarrier(opt.value)}
              style={{
                display:      'flex',
                flexDirection: 'row',
                alignItems:   'center',
                width:        '100%',
                minHeight:    64,
                borderRadius: 12,
                border:       'none',
                background:   selected ? '#1A1A1A' : '#F5F5F5',
                cursor:       'pointer',
                padding:      '0 16px',
                gap:          14,
              }}
            >
              <span style={{ fontSize: 24, flexShrink: 0 }}>{opt.emoji}</span>
              <span style={{
                fontSize:   16,
                fontWeight: 600,
                color:      selected ? '#FFFFFF' : '#1A1A1A',
                fontFamily: 'var(--font-dm-sans)',
                textAlign:  'left',
              }}>
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>

      <button
        onClick={onNext}
        disabled={!canContinue}
        style={{
          width:        '100%',
          height:       56,
          borderRadius: 14,
          border:       'none',
          background:   canContinue ? '#1A1A1A' : '#D1D1D1',
          color:        '#FFFFFF',
          fontSize:     16,
          fontWeight:   600,
          fontFamily:   'var(--font-dm-sans)',
          cursor:       canContinue ? 'pointer' : 'not-allowed',
        }}
      >
        Continue
      </button>

      <button
        onClick={onBack}
        style={{
          width:      '100%',
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
