'use client'

/**
 * RulerSlider — horizontally scrollable ruler with tick marks.
 * Major ticks every 5 units (16px tall), minor ticks every 1 unit (8px tall).
 * Fixed centre indicator line. 10px per unit width.
 * Snaps to nearest integer on scroll end.
 */

import {
  useRef,
  useEffect,
  useCallback,
  useState,
} from 'react'

interface RulerSliderProps {
  min:      number
  max:      number
  value:    number
  onChange: (val: number) => void
  unit?:    string
}

const PX_PER_UNIT   = 10
const TICK_W        = 1   // px
const MAJOR_H       = 16
const MINOR_H       = 8
const RULER_H       = 48  // total ruler height

export default function RulerSlider({
  min,
  max,
  value,
  onChange,
  unit = '',
}: RulerSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef     = useRef<ReturnType<typeof setTimeout>>()
  const [display, setDisplay] = useState(value)

  const range   = max - min
  const totalW  = range * PX_PER_UNIT

  // Convert value → scrollLeft (centre indicator at value)
  const valToScroll = useCallback(
    (v: number) => {
      if (!containerRef.current) return 0
      const vp = containerRef.current.clientWidth
      return (v - min) * PX_PER_UNIT - vp / 2
    },
    [min],
  )

  // Scroll to value (instant on mount, smooth otherwise)
  const scrollTo = useCallback(
    (v: number, behavior: ScrollBehavior = 'smooth') => {
      if (!containerRef.current) return
      containerRef.current.scrollTo({ left: valToScroll(v), behavior })
    },
    [valToScroll],
  )

  // Mount: jump to initial value
  useEffect(() => {
    scrollTo(value, 'instant' as ScrollBehavior)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // External value changes
  useEffect(() => {
    scrollTo(value, 'smooth')
    setDisplay(value)
  }, [value, scrollTo])

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const vp   = containerRef.current.clientWidth
    const raw  = (containerRef.current.scrollLeft + vp / 2) / PX_PER_UNIT + min
    const near = Math.max(min, Math.min(max, Math.round(raw)))
    setDisplay(near)

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (!containerRef.current) return
      const vp2  = containerRef.current.clientWidth
      const raw2 = (containerRef.current.scrollLeft + vp2 / 2) / PX_PER_UNIT + min
      const snap = Math.max(min, Math.min(max, Math.round(raw2)))
      scrollTo(snap, 'smooth')
      if (snap !== value) onChange(snap)
    }, 150)
  }, [min, max, onChange, scrollTo, value])

  // Build tick array once
  const ticks: Array<{ x: number; major: boolean; label?: string }> = []
  for (let v = min; v <= max; v++) {
    const major = v % 5 === 0
    ticks.push({ x: (v - min) * PX_PER_UNIT, major, label: major ? String(v) : undefined })
  }

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      {/* Big number display */}
      <div style={{
        textAlign: 'center',
        fontSize: 48,
        fontWeight: 700,
        color: '#1A1A1A',
        fontFamily: 'var(--font-dm-sans)',
        lineHeight: 1,
        marginBottom: 16,
      }}>
        {display}
        <span style={{ fontSize: 20, fontWeight: 400, color: '#9A9A9A', marginLeft: 6 }}>
          {unit}
        </span>
      </div>

      {/* Fixed centre indicator */}
      <div style={{
        position: 'absolute',
        left:   '50%',
        bottom: 0,
        transform: 'translateX(-50%)',
        width:   2,
        height:  RULER_H + 4,
        background: '#1A1A1A',
        borderRadius: 1,
        zIndex: 3,
        pointerEvents: 'none',
      }} />

      {/* Scrollable ruler */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          overflowX:   'scroll',
          overflowY:   'hidden',
          scrollbarWidth: 'none',
          height:      RULER_H,
          position:    'relative',
          cursor:      'grab',
        }}
      >
        {/* Inner SVG ruler */}
        <svg
          width={totalW}
          height={RULER_H}
          style={{ display: 'block', overflow: 'visible' }}
        >
          {ticks.map(tick => (
            <g key={tick.x}>
              <rect
                x={tick.x - TICK_W / 2}
                y={RULER_H - (tick.major ? MAJOR_H : MINOR_H)}
                width={TICK_W}
                height={tick.major ? MAJOR_H : MINOR_H}
                fill={tick.major ? '#1A1A1A' : '#D1D1D1'}
              />
              {tick.label && (
                <text
                  x={tick.x}
                  y={RULER_H - MAJOR_H - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#9A9A9A"
                  fontFamily="var(--font-dm-sans)"
                >
                  {tick.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
