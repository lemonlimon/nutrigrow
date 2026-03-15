'use client'

import { useOnboarding, WorkoutFrequency } from '../context/OnboardingContext'

type Option = {
  emoji:       string
  value:       WorkoutFrequency
  valueLabel:  string
  description: string
}

const OPTIONS: Option[] = [
  { emoji: '🦥', value: '0-2', valueLabel: '0–2', description: 'Workouts now and then'   },
  { emoji: '🐇', value: '3-5', valueLabel: '3–5', description: 'A few workouts per week' },
  { emoji: '🐆', value: '6+',  valueLabel: '6+',  description: 'Dedicated athlete'        },
]

export default function Step5WorkoutFreq({ onNext, onBack: _onBack }: { onNext: () => void; onBack: () => void }) {
  const { data, update } = useOnboarding()

  const handleSelect = (value: WorkoutFrequency) => {
    update({ workout_frequency: value })
    setTimeout(onNext, 120)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      padding: '0 20px',
      fontFamily: 'var(--font-dm-sans)',
    }}>
      <h1 style={{
        fontSize: 26,
        fontWeight: 700,
        color: '#1A1A1A',
        marginBottom: 8,
        fontFamily: 'var(--font-dm-sans)',
      }}>
        How many workouts per week?
      </h1>
      <p style={{ fontSize: 15, color: '#6B6B6B', marginBottom: 32, marginTop: 0 }}>
        This will be used to calibrate your custom plan.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {OPTIONS.map(opt => {
          const selected = data.workout_frequency === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              style={{
                width: '100%',
                minHeight: 64,
                borderRadius: 12,
                background: selected ? '#1A1A1A' : '#F5F5F5',
                color: selected ? '#fff' : '#1A1A1A',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                padding: '16px 20px',
                fontFamily: 'var(--font-dm-sans)',
                gap: 16,
                transition: 'background 0.15s, color 0.15s',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{opt.emoji}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>
                  {opt.valueLabel}
                </span>
                <span style={{
                  fontSize: 13,
                  color: selected ? 'rgba(255,255,255,0.7)' : '#6B6B6B',
                  lineHeight: 1.3,
                }}>
                  {opt.description}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
