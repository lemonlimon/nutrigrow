'use client'

import { useOnboarding, GoalType } from '../context/OnboardingContext'

type Option = { emoji: string; label: string; value: GoalType }

const OPTIONS: Option[] = [
  { emoji: '🔥', label: 'Lose weight',     value: 'lose_weight'     },
  { emoji: '⚖️', label: 'Maintain weight', value: 'maintain_weight' },
  { emoji: '💪', label: 'Gain muscle',     value: 'gain_muscle'     },
]

export default function Step1Goal({ onNext, onBack: _onBack }: { onNext: () => void; onBack: () => void }) {
  const { data, update } = useOnboarding()

  const handleSelect = (value: GoalType) => {
    update({ goal_type: value })
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
        What is your goal?
      </h1>
      <p style={{ fontSize: 15, color: '#6B6B6B', marginBottom: 32, marginTop: 0 }}>
        This will be used to calibrate your custom plan.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {OPTIONS.map(opt => {
          const selected = data.goal_type === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              style={{
                width: '100%',
                height: 64,
                borderRadius: 12,
                background: selected ? '#1A1A1A' : '#F5F5F5',
                color: selected ? '#fff' : '#1A1A1A',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: '0 20px',
                fontFamily: 'var(--font-dm-sans)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <span style={{ fontSize: 24, lineHeight: 1 }}>{opt.emoji}</span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
