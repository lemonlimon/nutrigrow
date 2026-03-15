'use client'

import { useState } from 'react'
import { useOnboarding } from '../context/OnboardingContext'
import type { DietType } from '../context/OnboardingContext'

interface Props {
  onNext: () => void
  onBack: () => void
}

interface DietOption {
  emoji: string
  label: string
  value: DietType
}

const OPTIONS: DietOption[] = [
  { emoji: '🍖', label: 'Classic',      value: 'classic'      },
  { emoji: '🐟', label: 'Pescatarian',  value: 'pescatarian'  },
  { emoji: '🥦', label: 'Vegetarian',   value: 'vegetarian'   },
  { emoji: '🌱', label: 'Vegan',        value: 'vegan'        },
]

export default function Step10DietType({ onNext, onBack }: Props) {
  const { data, update } = useOnboarding()
  const [selecting, setSelecting] = useState<DietType | null>(null)

  function handleSelect(value: DietType) {
    setSelecting(value)
    update({ diet_type: value })
    setTimeout(() => {
      setSelecting(null)
      onNext()
    }, 120)
  }

  return (
    <div style={{ padding: '24px 20px', fontFamily: 'var(--font-dm-sans)' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A', marginBottom: 24 }}>
        Do you follow a specific diet?
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {OPTIONS.map((opt) => {
          const selected = data.diet_type === opt.value || selecting === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              style={{
                display:       'flex',
                flexDirection: 'row',
                alignItems:    'center',
                width:         '100%',
                minHeight:     64,
                borderRadius:  12,
                border:        'none',
                background:    selected ? '#1A1A1A' : '#F5F5F5',
                cursor:        'pointer',
                padding:       '0 16px',
                gap:           14,
                transition:    'background 0.15s ease',
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
        onClick={onBack}
        style={{
          width:      '100%',
          height:     48,
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
