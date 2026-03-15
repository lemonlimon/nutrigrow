'use client'

import { useOnboarding } from '../context/OnboardingContext'
import type { ReferralSource } from '../context/OnboardingContext'

interface Props {
  onNext: () => void
  onBack: () => void
}

interface ReferralOption {
  emoji: string
  label: string
  value: ReferralSource
}

const OPTIONS: ReferralOption[] = [
  { emoji: '📺', label: 'YouTube',                value: 'youtube'   },
  { emoji: '🎵', label: 'TikTok',                 value: 'tiktok'    },
  { emoji: '📸', label: 'Instagram',              value: 'instagram' },
  { emoji: '🗣️', label: 'Friend / Word of mouth', value: 'friend'    },
  { emoji: '❓', label: 'Other',                  value: 'other'     },
]

export default function Step16Referral({ onNext, onBack }: Props) {
  const { data, update } = useOnboarding()

  const canContinue = data.referral_source !== null

  return (
    <div style={{ padding: '24px 20px', fontFamily: 'var(--font-dm-sans)' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A', marginBottom: 24 }}>
        Where did you hear about us?
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {OPTIONS.map((opt) => {
          const selected = data.referral_source === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => update({ referral_source: opt.value })}
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
