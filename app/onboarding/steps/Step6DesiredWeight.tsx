'use client'

import { useEffect } from 'react'
import { useOnboarding } from '../context/OnboardingContext'
import RulerSlider from '../components/RulerSlider'

interface Props {
  onNext: () => void
  onBack: () => void
}

const GOAL_LABELS: Record<string, string> = {
  lose_weight:     'Goal: Lose weight',
  maintain_weight: 'Goal: Maintain weight',
  gain_muscle:     'Goal: Gain muscle',
}

export default function Step6DesiredWeight({ onNext, onBack }: Props) {
  const { data, update } = useOnboarding()

  const unit        = data.unit === 'imperial' ? 'lbs' : 'kg'
  const sliderMin   = data.unit === 'imperial' ? 80  : 30
  const sliderMax   = data.unit === 'imperial' ? 400 : 200
  const defaultTarget = Math.round(data.current_weight * 0.9)

  // Set default target_weight on mount if null
  useEffect(() => {
    if (data.target_weight === null) {
      update({ target_weight: defaultTarget })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const target  = data.target_weight ?? defaultTarget
  const current = data.current_weight
  const diff    = Math.abs(target - current)

  const diffLabel =
    target < current ? `Lose ${diff} ${unit}`
    : target === current ? 'Maintain current weight'
    : `Gain ${diff} ${unit}`

  const goalLabel = data.goal_type ? GOAL_LABELS[data.goal_type] : null
  const canContinue = data.target_weight !== null

  return (
    <div style={{ padding: '24px 20px', fontFamily: 'var(--font-dm-sans)' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
        What is your desired weight?
      </h1>

      {goalLabel && (
        <p style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 32 }}>
          {goalLabel}
        </p>
      )}

      <RulerSlider
        min={sliderMin}
        max={sliderMax}
        value={target}
        unit={unit}
        onChange={(val) => update({ target_weight: val })}
      />

      <p style={{
        fontSize: 16,
        textAlign: 'center',
        color: '#6B6B6B',
        marginTop: 20,
        marginBottom: 40,
      }}>
        {diffLabel}
      </p>

      <button
        onClick={onNext}
        disabled={!canContinue}
        style={{
          width: '100%',
          height: 56,
          borderRadius: 14,
          border: 'none',
          background: canContinue ? '#1A1A1A' : '#D1D1D1',
          color: '#FFFFFF',
          fontSize: 16,
          fontWeight: 600,
          fontFamily: 'var(--font-dm-sans)',
          cursor: canContinue ? 'pointer' : 'not-allowed',
        }}
      >
        Continue
      </button>

      <button
        onClick={onBack}
        style={{
          width: '100%',
          height: 48,
          marginTop: 12,
          border: 'none',
          background: 'transparent',
          color: '#6B6B6B',
          fontSize: 15,
          fontFamily: 'var(--font-dm-sans)',
          cursor: 'pointer',
        }}
      >
        Back
      </button>
    </div>
  )
}
