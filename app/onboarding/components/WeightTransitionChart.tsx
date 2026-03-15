'use client'

/**
 * WeightTransitionChart — animated SVG line chart for Step 12.
 * Line is flat days 0–3, curves down days 3–30.
 * Fill area is light orange/beige. Stroke animates on mount.
 */

import { useEffect, useRef } from 'react'

const W = 300
const H = 180
const PAD = { top: 20, right: 20, bottom: 32, left: 16 }

// Control points (normalized 0–1)
const POINTS = [
  { t: 0,    y: 0.05  },
  { t: 3/30, y: 0.05  },
  { t: 7/30, y: 0.20  },
  { t: 1,    y: 0.82  },
]

function _lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function toSvgX(t: number) {
  return PAD.left + t * (W - PAD.left - PAD.right)
}
function toSvgY(y: number) {
  return PAD.top + y * (H - PAD.top - PAD.bottom)
}

// Build a cubic bezier path through the 4 points
function buildPath(): string {
  const pts = POINTS.map(p => ({ x: toSvgX(p.t), y: toSvgY(p.y) }))

  // Smooth curve using catmull-rom → bezier conversion
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`
  }
  return d
}

const PATH = buildPath()
const lastPt = POINTS[POINTS.length - 1]
const LAST_X = toSvgX(lastPt.t)
const LAST_Y = toSvgY(lastPt.y)

// Build fill path (close below the line)
const FILL_PATH =
  PATH +
  ` L ${LAST_X} ${toSvgY(1)} L ${toSvgX(0)} ${toSvgY(1)} Z`

// X-axis label positions
const LABELS = [
  { t: 3/30,  text: '3 Days'  },
  { t: 7/30,  text: '7 Days'  },
  { t: 1,     text: '30 Days' },
]

export default function WeightTransitionChart() {
  const strokeRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const el = strokeRef.current
    if (!el) return
    const len = el.getTotalLength()
    el.style.strokeDasharray  = String(len)
    el.style.strokeDashoffset = String(len)
    el.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: 1400, easing: 'ease-out', fill: 'forwards' },
    )
  }, [])

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: W, display: 'block', margin: '0 auto' }}
    >
      <defs>
        <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#F5A623" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#F5A623" stopOpacity="0.03" />
        </linearGradient>
      </defs>

      {/* Fill area */}
      <path d={FILL_PATH} fill="url(#fillGrad)" />

      {/* Animated line */}
      <path
        ref={strokeRef}
        d={PATH}
        fill="none"
        stroke="#F5A623"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Orange circle at 30-day point */}
      <circle cx={LAST_X} cy={LAST_Y} r={6} fill="#F5A623" />
      <circle cx={LAST_X} cy={LAST_Y} r={3} fill="#fff" />

      {/* X-axis labels */}
      {LABELS.map(l => (
        <text
          key={l.text}
          x={toSvgX(l.t)}
          y={H - 4}
          textAnchor="middle"
          fontSize={10}
          fill="#9A9A9A"
          fontFamily="var(--font-dm-sans)"
        >
          {l.text}
        </text>
      ))}

      {/* Baseline */}
      <line
        x1={PAD.left} y1={toSvgY(0.9)}
        x2={W - PAD.right} y2={toSvgY(0.9)}
        stroke="#E0E0E0" strokeWidth={1}
      />
    </svg>
  )
}
