'use client'

import { useState, useEffect } from 'react'
import { useOnboarding } from '../context/OnboardingContext'

interface Props {
  onNext: () => void
  onBack: () => void
}

interface Preset {
  emoji:  string
  label:  string
  imp:    number
  metric: number
}

const PRESETS: Preset[] = [
  { emoji: '🦥', label: 'Slow',        imp: 0.5,  metric: 0.2  },
  { emoji: '🐇', label: 'Recommended', imp: 1.0,  metric: 0.45 },
  { emoji: '🐆', label: 'Fast',        imp: 2.0,  metric: 0.9  },
]

function formatTimeframe(days: number): string {
  if (days > 28) return `${Math.round(days / 30)} months`
  if (days > 14) return `${Math.round(days / 7)} weeks`
  return `${Math.round(days)} days`
}

export default function Step8WeightSpeed({ onNext, onBack }: Props) {
  const { data, update } = useOnboarding()

  const isImperial = data.unit === 'imperial'
  const maxSafe    = isImperial ? 2.0 : 0.9
  const unit       = isImperial ? 'lbs' : 'kg'
  const defaultSpeed = isImperial ? 1.0 : 0.45

  const [speed, setSpeed]           = useState<number>(data.weight_loss_speed ?? defaultSpeed)
  const [pulsing, setPulsing]       = useState<number | null>(null)

  // Sync initial value into context
  useEffect(() => {
    if (data.weight_loss_speed === null) {
      update({ weight_loss_speed: defaultSpeed })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applySpeed(val: number) {
    setSpeed(val)
    update({ weight_loss_speed: val })
  }

  function handlePreset(preset: Preset, idx: number) {
    const val = isImperial ? preset.imp : preset.metric
    applySpeed(val)
    setPulsing(idx)
    setTimeout(() => setPulsing(null), 300)
  }

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(parseFloat(e.target.value).toFixed(1))
    applySpeed(val)
  }

  const activePresetIdx = PRESETS.findIndex((p) => {
    const pVal = isImperial ? p.imp : p.metric
    return Math.abs(pVal - speed) < 0.05
  })

  // Info card calculations
  const currentW    = data.current_weight ?? 154
  const targetW     = data.target_weight  ?? Math.round(currentW * 0.9)
  const weightToLose = Math.abs(currentW - targetW)
  const days        = speed > 0 ? (weightToLose / speed) * 7 : 0
  const caloriesPerUnit = isImperial ? 3500 : 7700
  const tdee        = 2000
  const dailyCal    = Math.max(1200, tdee - Math.round((speed * caloriesPerUnit) / 7))
  const timeframe   = formatTimeframe(days)

  const showWarning   = speed >= maxSafe * 0.9
  const canContinue   = data.weight_loss_speed !== null

  return (
    <div style={{ padding: '24px 20px', fontFamily: 'var(--font-dm-sans)' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A', marginBottom: 28 }}>
        How fast do you want to lose weight?
      </h1>

      {/* Animal preset row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        {PRESETS.map((preset, idx) => {
          const isActive = activePresetIdx === idx
          const isPulsing = pulsing === idx
          return (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset, idx)}
              style={{
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                gap:            6,
                background:     'transparent',
                border:         'none',
                cursor:         'pointer',
                padding:        '8px 12px',
                transform:      isPulsing ? 'scale(1.2)' : isActive ? 'scale(1.1)' : 'scale(1)',
                transition:     'transform 0.2s ease',
              }}
            >
              <span style={{ fontSize: 32 }}>{preset.emoji}</span>
              <span style={{
                fontSize:   12,
                fontFamily: 'var(--font-dm-sans)',
                color:      isActive ? '#F5A623' : '#9A9A9A',
                fontWeight: isActive ? 600 : 400,
              }}>
                {preset.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Range slider */}
      <input
        type="range"
        min={0.5}
        max={maxSafe}
        step={0.1}
        value={speed}
        onChange={handleSlider}
        style={{
          width:       '100%',
          accentColor: '#1A1A1A',
          marginBottom: 24,
          cursor:      'pointer',
        }}
      />

      <p style={{
        textAlign:    'center',
        fontSize:     14,
        color:        '#6B6B6B',
        marginBottom: 20,
      }}>
        {speed.toFixed(1)} {unit}/week
      </p>

      {/* Info card */}
      <div style={{
        background:   '#F5F5F5',
        borderRadius: 12,
        padding:      16,
        marginBottom: 16,
      }}>
        <p style={{ fontSize: 15, color: '#1A1A1A', margin: '0 0 8px' }}>
          You will reach your goal in{' '}
          <span style={{ color: '#F5A623', fontWeight: 600 }}>{timeframe}</span>
        </p>
        <p style={{ fontSize: 15, color: '#1A1A1A', margin: 0 }}>
          Daily calorie goal:{' '}
          <span style={{ fontWeight: 700 }}>{dailyCal} cal</span>
        </p>
      </div>

      {/* Fast warning */}
      {showWarning && (
        <div style={{
          background:   '#FFF3CD',
          borderRadius: 8,
          padding:      '8px 12px',
          fontSize:     13,
          color:        '#92640A',
          marginBottom: 20,
        }}>
          ⚠️ Fast loss can cause fatigue or loose skin.
        </div>
      )}

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
