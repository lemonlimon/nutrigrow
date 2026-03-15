'use client'

import { useOnboarding, lbsToKg, cmToFtIn, ftInToCm, UnitSystem } from '../context/OnboardingContext'
import WheelPicker from '../components/WheelPicker'

const FEET_ITEMS    = [2, 3, 4, 5, 6, 7, 8]
const INCHES_ITEMS  = Array.from({ length: 12 }, (_, i) => i)           // 0–11
const HEIGHT_CM     = Array.from({ length: 151 }, (_, i) => i + 100)    // 100–250
const WEIGHT_LBS    = Array.from({ length: 321 }, (_, i) => i + 80)     // 80–400
const WEIGHT_KG     = Array.from({ length: 171 }, (_, i) => i + 30)     // 30–200

export default function Step3HeightWeight({ onNext, onBack: _onBack }: { onNext: () => void; onBack: () => void }) {
  const { data, update } = useOnboarding()

  const isImperial = data.unit === 'imperial'

  const handleUnitToggle = (newUnit: UnitSystem) => {
    if (newUnit === data.unit) return

    if (newUnit === 'metric') {
      const height_cm      = ftInToCm(data.height_ft, data.height_in)
      const current_weight = lbsToKg(data.current_weight)
      update({ unit: 'metric', height_cm, current_weight, current_weight_unit: 'kg' })
    } else {
      const { ft, inch }   = cmToFtIn(data.height_cm)
      const current_weight = Math.round(data.current_weight * 2.20462)
      update({ unit: 'imperial', height_ft: ft, height_in: inch, current_weight, current_weight_unit: 'lbs' })
    }
  }

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    height: 36,
    borderRadius: 100,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'var(--font-dm-sans)',
    background: active ? '#1A1A1A' : 'transparent',
    color: active ? '#fff' : '#6B6B6B',
    transition: 'background 0.15s, color 0.15s',
  })

  const groupLabel: React.CSSProperties = {
    fontSize: 13,
    color: '#9A9A9A',
    fontFamily: 'var(--font-dm-sans)',
    marginBottom: 8,
    textAlign: 'center',
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
        Height &amp; weight
      </h1>
      <p style={{ fontSize: 15, color: '#6B6B6B', marginBottom: 24, marginTop: 0 }}>
        This will be used to calibrate your custom plan.
      </p>

      {/* Unit toggle */}
      <div style={{
        display: 'inline-flex',
        background: '#F0F0F0',
        borderRadius: 100,
        padding: 4,
        marginBottom: 36,
        alignSelf: 'center',
        width: 200,
      }}>
        <button style={toggleStyle(isImperial)}  onClick={() => handleUnitToggle('imperial')}>
          Imperial
        </button>
        <button style={toggleStyle(!isImperial)} onClick={() => handleUnitToggle('metric')}>
          Metric
        </button>
      </div>

      {/* Picker groups */}
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start' }}>

        {/* Height group */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={groupLabel}>Height</p>
          {isImperial ? (
            <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
              <WheelPicker
                items={FEET_ITEMS}
                value={data.height_ft}
                onChange={val => update({ height_ft: val as number })}
                width={60}
                label="ft"
              />
              <WheelPicker
                items={INCHES_ITEMS}
                value={data.height_in}
                onChange={val => update({ height_in: val as number })}
                width={60}
                label="in"
              />
            </div>
          ) : (
            <WheelPicker
              items={HEIGHT_CM}
              value={data.height_cm}
              onChange={val => update({ height_cm: val as number })}
              width={80}
              label="cm"
            />
          )}
        </div>

        {/* Weight group */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={groupLabel}>Weight</p>
          <WheelPicker
            items={isImperial ? WEIGHT_LBS : WEIGHT_KG}
            value={data.current_weight}
            onChange={val => update({ current_weight: val as number })}
            width={80}
            label={isImperial ? 'lbs' : 'kg'}
          />
        </div>

      </div>

      {/* Continue button */}
      <button
        onClick={onNext}
        style={{
          marginTop: 48,
          width: '100%',
          height: 52,
          borderRadius: 100,
          background: '#1A1A1A',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontSize: 16,
          fontWeight: 600,
          fontFamily: 'var(--font-dm-sans)',
        }}
      >
        Continue
      </button>
    </div>
  )
}
