'use client'

// Water tracker — bottle-fill UI
// Stores total ml consumed in the `glasses` column (0–2000)
// bottleSize persists in localStorage key "mizan_bottle_size"

import { useState, useEffect } from 'react'

const GOAL = 2000 // ml

const FRACTIONS = [
  { label: '¼ bottle', value: 0.25 },
  { label: '½ bottle', value: 0.50 },
  { label: '¾ bottle', value: 0.75 },
  { label: 'Full bottle', value: 1.00 },
] as const

const BOTTLE_SIZES = [
  { label: '250ml', value: 250  },
  { label: '350ml', value: 350  },
  { label: '500ml', value: 500  },
  { label: '750ml', value: 750  },
  { label: '1L',    value: 1000 },
] as const

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

interface WaterCardProps {
  patientId: string
}

export default function WaterCard({ patientId }: WaterCardProps) {
  const [totalMl,          setTotalMl]          = useState(0)
  const [bottleSize,       setBottleSize]        = useState(250)
  const [fillFraction,     setFillFraction]      = useState(0.5)
  const [isLoading,        setIsLoading]         = useState(true)
  const [showCelebration,  setShowCelebration]   = useState(false)
  const [unit,             setUnit]              = useState<'ml' | 'oz'>('ml')

  const date      = todayISO()
  const overGoal  = totalMl > GOAL
  const pct       = Math.min(1, totalMl / GOAL)   // capped at 1 for the bar width only
  const pctLabel  = Math.round(pct * 100)
  const overBy    = totalMl - GOAL                 // ml over goal (positive when over)
  const toAdd     = Math.round(bottleSize * fillFraction)

  // Unit display helpers — all internal state stays in ml
  const OZ = 0.033814
  const fmtConsumed = unit === 'oz'
    ? `${(totalMl * OZ).toFixed(1)}`
    : totalMl.toLocaleString()
  const displayUnit   = unit === 'oz' ? 'fl oz' : 'ml'
  const displayGoal   = unit === 'oz' ? 'Goal: 67.6 fl oz' : 'Goal: 2,000 ml'
  const displayToAdd  = unit === 'oz'
    ? `${(toAdd * OZ).toFixed(1)} fl oz`
    : `${toAdd}ml`
  const displayOverBy = unit === 'oz'
    ? `${(overBy * OZ).toFixed(1)} fl oz`
    : `${overBy.toLocaleString()}ml`

  // Inject keyframes once (wave + celebration float)
  useEffect(() => {
    const ID = 'mizan-wave-kf'
    if (document.getElementById(ID)) return
    const style = document.createElement('style')
    style.id = ID
    style.textContent = `
      @keyframes waveMove {
        from { transform: translateX(0); }
        to   { transform: translateX(72px); }
      }
      @keyframes floatUp {
        0%   { opacity: 1; transform: translateY(0)     scale(1);   }
        100% { opacity: 0; transform: translateY(-70px) scale(1.3); }
      }
    `
    document.head.appendChild(style)
  }, [])

  // Load persisted bottle size (default 250ml)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mizan_bottle_size')
      if (saved) setBottleSize(Number(saved))
    } catch {
      // ignore — localStorage may be unavailable
    }
  }, [])

  // Load today's ml from API
  useEffect(() => {
    const fetchWater = async () => {
      try {
        const res  = await fetch(`/api/water-log?patientId=${patientId}&date=${date}`)
        const json = await res.json()
        if (json.success) setTotalMl(json.data.glasses)
      } catch {
        // fail silently — start at 0
      } finally {
        setIsLoading(false)
      }
    }
    fetchWater()
  }, [patientId, date]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBottleSize = (ml: number) => {
    setBottleSize(ml)
    try { localStorage.setItem('mizan_bottle_size', String(ml)) } catch { /* ignore */ }
  }

  const logDrink = async () => {
    const newTotal = totalMl + toAdd          // FIX 1: no Math.min cap
    setTotalMl(newTotal)                      // optimistic update
    setFillFraction(0.5)                      // reset to half

    // FIX 6: trigger celebration burst
    setShowCelebration(true)
    setTimeout(() => setShowCelebration(false), 1200)

    try {
      await fetch('/api/water-log', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ patientId, date, glasses: newTotal }),
      })
    } catch {
      // fail silently — optimistic value stays
    }
  }

  const resetToday = () => {
    setTotalMl(0)
    fetch('/api/water-log', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ patientId, date, glasses: 0 }),
    }).catch(() => { /* fail silently */ })
  }

  // Bottle fill: y=133 (empty/bottom) → y=40 (full/top)
  // range is 93px over the fillable body of the bottle
  const waterY   = 133 - fillFraction * 93
  const waveY    = waterY - 8

  return (
    <div style={{
      background:   '#fff',
      borderRadius: 16,
      padding:      24,
      marginBottom: 16,
      border:       '1px solid #f0f0f0',
    }}>

      {/* ── SECTION 1: Total progress bar ──────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          {/* Left: consumed amount */}
          <div>
            <span style={{ fontSize: 28, color: '#1a6fa8', fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
              {fmtConsumed}
            </span>
            <span style={{ fontSize: 14, color: '#999', fontFamily: 'DM Sans, sans-serif' }}> {displayUnit}</span>
          </div>

          {/* Right: goal label + ml/oz toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#bbb', fontFamily: 'DM Sans, sans-serif' }}>
              {displayGoal}
            </span>
            <div style={{ display: 'flex', gap: 2 }}>
              {(['ml', 'oz'] as const).map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  style={{
                    padding:      '2px 8px',
                    borderRadius: 20,
                    fontSize:     11,
                    fontFamily:   'DM Sans, sans-serif',
                    fontWeight:   unit === u ? 600 : 400,
                    border:       'none',
                    background:   unit === u ? '#1a6fa8' : 'transparent',
                    color:        unit === u ? '#fff'    : '#bbb',
                    cursor:       'pointer',
                    lineHeight:   '18px',
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ width: '100%', height: 10, background: '#EBF5FF', borderRadius: 99 }}>
          <div style={{
            height:       10,
            width:        `${pctLabel}%`,
            background:   'linear-gradient(90deg, #5BA4CF, #1a6fa8)',
            borderRadius: 99,
            transition:   'width 0.6s cubic-bezier(0.34, 1.2, 0.64, 1)',
          }} />
        </div>

        {/* FIX 3: over-goal text vs normal percentage */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
          {overGoal ? (
            <p style={{ fontSize: 11, color: '#1D9E75', margin: 0, fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
              {displayOverBy} over goal · Great work!
            </p>
          ) : (
            <p style={{ fontSize: 11, color: '#bbb', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
              {pctLabel}% of daily goal
            </p>
          )}

          {/* FIX 4: Reset button */}
          <button
            type="button"
            onClick={resetToday}
            style={{
              fontSize:    11,
              color:       '#bbb',
              background:  'none',
              border:      'none',
              padding:     0,
              cursor:      'pointer',
              fontFamily:  'DM Sans, sans-serif',
              display:     'block',
            }}
          >
            Reset today
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ height: 140 }} />
      ) : (
        /* ── SECTION 2: Bottle + controls ───────────────────────────────── */
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* LEFT — Bottle SVG */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg width="64" height="140" viewBox="0 0 72 160" style={{ overflow: 'visible' }}>
              <defs>
                <clipPath id="bottleClip">
                  <path d="M22 18 L22 8 Q22 4 26 4 L46 4 Q50 4 50 8 L50 18 Q58 22 62 32 L62 140 Q62 156 46 156 L26 156 Q10 156 10 140 L10 32 Q14 22 22 18 Z" />
                </clipPath>
                <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#5BA4CF" />
                  <stop offset="100%" stopColor="#1a6fa8" />
                </linearGradient>
              </defs>

              {/* Bottle outline */}
              <path
                d="M22 18 L22 8 Q22 4 26 4 L46 4 Q50 4 50 8 L50 18 Q58 22 62 32 L62 140 Q62 156 46 156 L26 156 Q10 156 10 140 L10 32 Q14 22 22 18 Z"
                fill="#F0F8FF"
                stroke="#BDE0FF"
                strokeWidth="2"
              />

              {/* Water fill — clipped to bottle shape */}
              <g clipPath="url(#bottleClip)">
                <rect
                  x="0"
                  width="72"
                  height="156"
                  fill="url(#waterGradient)"
                  opacity={0.85}
                  style={{
                    y:          waterY,
                    transition: 'y 0.6s cubic-bezier(0.34, 1.2, 0.64, 1)',
                  } as React.CSSProperties}
                />

                {/* Wave at water surface */}
                <g style={{
                  transform:  `translateY(${waveY}px)`,
                  transition: 'transform 0.6s cubic-bezier(0.34, 1.2, 0.64, 1)',
                }}>
                  <svg x={-72} width="216" height="16" overflow="visible">
                    <path
                      d="M0,8 Q18,0 36,8 Q54,16 72,8 Q90,0 108,8 Q126,16 144,8 Q162,0 180,8 Q198,16 216,8 L216,16 L0,16 Z"
                      fill="url(#waterGradient)"
                      opacity={0.85}
                    >
                      <animateTransform
                        attributeName="transform"
                        type="translate"
                        from="0,0"
                        to="72,0"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </path>
                  </svg>
                </g>
              </g>

              {/* Shine */}
              <path
                d="M20 35 Q18 80 20 115"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />

              {/* Level markers */}
              <line x1="52" y1="133" x2="58" y2="133" stroke="#BDE0FF" strokeWidth="1" />
              <line x1="52" y1="88"  x2="58" y2="88"  stroke="#BDE0FF" strokeWidth="1" />
              <line x1="52" y1="40"  x2="58" y2="40"  stroke="#BDE0FF" strokeWidth="1" />
              <text x="60" y="136" fontSize="7" fill="#BDE0FF">E</text>
              <text x="60" y="91"  fontSize="7" fill="#BDE0FF">½</text>
              <text x="60" y="43"  fontSize="7" fill="#BDE0FF">F</text>
            </svg>

            <p style={{
              fontSize:   11,
              color:      '#5BA4CF',
              textAlign:  'center',
              marginTop:  4,
              fontFamily: 'DM Sans, sans-serif',
            }}>
              {bottleSize >= 1000 ? '1L' : `${bottleSize}ml`} bottle
            </p>
          </div>

          {/* RIGHT — Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>

            {/* Fill fraction selector */}
            <div>
              <p style={{ fontSize: 11, color: '#888', margin: '0 0 6px', fontFamily: 'DM Sans, sans-serif' }}>
                How much did you drink?
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {FRACTIONS.map(({ label, value }) => {
                  const active = fillFraction === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFillFraction(value)}
                      style={{
                        padding:      '7px 12px',
                        borderRadius: 10,
                        fontSize:     12,
                        fontFamily:   'DM Sans, sans-serif',
                        fontWeight:   active ? 600 : 400,
                        border:       `1.5px solid ${active ? '#1a6fa8' : '#e0e0e0'}`,
                        background:   active ? '#EBF5FF' : '#fff',
                        color:        active ? '#1a6fa8' : '#666',
                        cursor:       'pointer',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Bottle size selector */}
            <div>
              <p style={{ fontSize: 11, color: '#888', margin: '0 0 6px', fontFamily: 'DM Sans, sans-serif' }}>
                My bottle size
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {BOTTLE_SIZES.map(({ label, value }) => {
                  const active = bottleSize === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleBottleSize(value)}
                      style={{
                        padding:      '5px 10px',
                        borderRadius: 20,
                        fontSize:     11,
                        fontFamily:   'DM Sans, sans-serif',
                        fontWeight:   active ? 600 : 400,
                        border:       `1.5px solid ${active ? '#1a6fa8' : '#e0e0e0'}`,
                        background:   active ? '#EBF5FF' : '#fff',
                        color:        active ? '#1a6fa8' : '#666',
                        cursor:       'pointer',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ml preview */}
            <p style={{
              fontSize:   13,
              color:      '#1a6fa8',
              fontWeight: 600,
              margin:     0,
              fontFamily: 'DM Sans, sans-serif',
            }}>
              + {displayToAdd} will be added
            </p>

            {/* FIX 2 + FIX 6: always-active log button with celebration overlay */}
            <div style={{ position: 'relative' }}>
              {/* Celebration drops */}
              {showCelebration && (
                <>
                  {[
                    { left: '10%', delay: '0ms'   },
                    { left: '25%', delay: '80ms'  },
                    { left: '40%', delay: '160ms' },
                    { left: '55%', delay: '240ms' },
                    { left: '70%', delay: '120ms' },
                    { left: '85%', delay: '200ms' },
                  ].map((drop, i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      style={{
                        position:       'absolute',
                        left:           drop.left,
                        bottom:         0,
                        fontSize:       18,
                        pointerEvents:  'none',
                        animation:      `floatUp 1s ease-out ${drop.delay} forwards`,
                        zIndex:         10,
                      }}
                    >
                      💧
                    </span>
                  ))}
                </>
              )}

              <button
                type="button"
                onClick={logDrink}
                style={{
                  width:        '100%',
                  height:       46,
                  borderRadius: 12,
                  border:       'none',
                  fontSize:     14,
                  fontFamily:   'DM Sans, sans-serif',
                  fontWeight:   600,
                  cursor:       'pointer',
                  background:   '#1a6fa8',
                  color:        '#fff',
                  transition:   'background 200ms',
                }}
              >
                Log this drink
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
