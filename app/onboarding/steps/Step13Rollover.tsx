'use client'

import { useOnboarding } from '../context/OnboardingContext'

interface Props {
  onNext: () => void
  onBack: () => void
}

/** Simple ring SVG. pct = 0–1 fill ratio. */
function Ring({
  pct,
  stroke,
  label,
  badge,
}: {
  pct:    number
  stroke: string
  label:  string
  badge?: { text: string; bg: string; color: string }
}) {
  const R   = 20
  const CX  = 25
  const CY  = 25
  const circumference = 2 * Math.PI * R

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: 50, height: 50 }}>
        <svg width="50" height="50" style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="#E0E0E0"
            strokeWidth={4}
          />
          {/* Fill */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={stroke}
            strokeWidth={4}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            strokeLinecap="round"
          />
        </svg>
        {badge && (
          <span style={{
            position:     'absolute',
            top:          -6,
            right:        -8,
            fontSize:     10,
            background:   badge.bg,
            color:        badge.color,
            borderRadius: 4,
            padding:      '2px 6px',
            fontWeight:   600,
            whiteSpace:   'nowrap',
            fontFamily:   'var(--font-dm-sans)',
          }}>
            {badge.text}
          </span>
        )}
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', fontFamily: 'var(--font-dm-sans)' }}>
        {label}
      </span>
    </div>
  )
}

export default function Step13Rollover({ onNext, onBack: _onBack }: Props) {
  const { update } = useOnboarding()

  function handleSelect(value: boolean) {
    update({ rollover_calories: value })
    onNext()
  }

  return (
    <div style={{ padding: '24px 20px', fontFamily: 'var(--font-dm-sans)' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
        Rollover extra calories to the next day?
      </h1>
      <p style={{ fontSize: 15, color: '#6B6B6B', marginBottom: 24 }}>
        Rollover up to 200 cals
      </p>

      {/* Comparison cards */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: 12, marginBottom: 28 }}>
        {/* Yesterday */}
        <div style={{
          background:   '#FFE8E8',
          borderRadius: 12,
          padding:      16,
          flex:         1,
          display:      'flex',
          flexDirection:'column',
          alignItems:   'center',
          gap:          8,
        }}>
          <span style={{ fontSize: 12, color: '#9A9A9A', alignSelf: 'flex-start' }}>Yesterday</span>
          <Ring pct={350 / 500} stroke="#FF6B6B" label="350 / 500 cal" />
          <span style={{ fontSize: 12, color: '#9A9A9A' }}>Cals left: 150</span>
        </div>

        {/* Today */}
        <div style={{
          background:   '#fff',
          border:       '1px solid #F0F0F0',
          borderRadius: 12,
          padding:      16,
          flex:         1,
          display:      'flex',
          flexDirection:'column',
          alignItems:   'center',
          gap:          8,
        }}>
          <span style={{ fontSize: 12, color: '#9A9A9A', alignSelf: 'flex-start' }}>Today</span>
          <Ring
            pct={350 / 650}
            stroke="#4A9EFF"
            label="350 / 650"
            badge={{ text: '+150', bg: '#E8F0FF', color: '#4A9EFF' }}
          />
          <span style={{ fontSize: 12, color: '#4A9EFF' }}>Cals left: 300</span>
        </div>
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
