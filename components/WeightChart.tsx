'use client'

// CHANGE 3: added gradient fill under line, dots changed to open circles

import { useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface WeightPoint {
  weight_kg: number
  logged_at: string
}

export interface WeightChartProps {
  points:    WeightPoint[]
  baseline?: { weight_kg: number; enrolled_at: string }
  unit?:     'kg' | 'lbs'
}

// ── Constants ─────────────────────────────────────────────────────────────────
const KG_TO_LBS = 2.20462

const VW      = 400
const VH      = 120
const PAD_L   = 38
const PAD_R   = 72
const PAD_T   = 10
const PAD_B   = 24
const CHART_W = VW - PAD_L - PAD_R   // 290
const CHART_H = VH - PAD_T - PAD_B   // 86

const TIP_W   = 112
const TIP_H   = 44
const TIP_GAP = 8

// ── Helpers ───────────────────────────────────────────────────────────────────
function toDisplay(kg: number, unit: 'kg' | 'lbs'): number {
  const v = unit === 'lbs' ? kg * KG_TO_LBS : kg
  return Math.round(v * 10) / 10
}

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export function WeightChart({ points, baseline, unit = 'kg' }: WeightChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  // ── Build full point list: prepend baseline if not already covered ─────────
  const allPoints: WeightPoint[] = []
  if (baseline) {
    const firstLogDate = points.length > 0 ? new Date(points[0].logged_at) : null
    const baselineDate = new Date(baseline.enrolled_at)
    if (!firstLogDate || baselineDate < firstLogDate) {
      allPoints.push({ weight_kg: baseline.weight_kg, logged_at: baseline.enrolled_at })
    }
  }
  allPoints.push(...points)

  if (allPoints.length < 2) return null

  // ── Convert to display unit ────────────────────────────────────────────────
  const dp = allPoints.map(p => ({ ...p, v: toDisplay(p.weight_kg, unit) }))

  const vals     = dp.map(p => p.v)
  const minV     = Math.min(...vals)
  const maxV     = Math.max(...vals)
  // When all values are the same, add ±6 unit padding so the line sits in the
  // middle of the chart instead of flatlining at the bottom edge.
  const padding  = maxV === minV ? 5 : 0
  const chartMin = minV - padding - 1
  const chartMax = maxV + padding + 1
  const rangeAdj = chartMax - chartMin

  const toX = (i: number) => PAD_L + (i / (dp.length - 1)) * CHART_W
  const toY = (v: number) => PAD_T + CHART_H - ((v - chartMin) / rangeAdj) * CHART_H

  // ── Paths ──────────────────────────────────────────────────────────────────
  const lineSegments = dp
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.v).toFixed(1)}`)
    .join(' ')

  // Area: follow the line, then close down to chart baseline
  const chartBottom = PAD_T + CHART_H
  const areaPath =
    lineSegments +
    ` L ${toX(dp.length - 1).toFixed(1)} ${chartBottom.toFixed(1)}` +
    ` L ${toX(0).toFixed(1)} ${chartBottom.toFixed(1)}` +
    ' Z'

  // ── Delta label ────────────────────────────────────────────────────────────
  const firstV    = dp[0].v
  const lastIdx   = dp.length - 1
  const lastV     = dp[lastIdx].v
  const deltaAbs  = lastV - firstV
  const deltaPct  = firstV !== 0 ? Math.round((deltaAbs / firstV) * 100) : 0
  const sign      = deltaAbs >= 0 ? '+' : ''
  const deltaStr  = `${sign}${deltaAbs.toFixed(1)} ${unit} (${sign}${deltaPct}%)`
  const deltaColor = deltaAbs < 0 ? '#1D9E75' : deltaAbs > 0 ? '#B94040' : '#888'

  // ── Trend-based chart colors (green for loss, grey for gain/flat) ──────────
  const trendDown = deltaAbs < 0
  const lineColor = trendDown ? '#1D9E75' : '#888888'
  const gradId    = trendDown ? 'weightGrad-green' : 'weightGrad-grey'
  const gradColor = trendDown ? '#1D9E75'  : '#888888'
  const deltaX    = toX(lastIdx) + 8
  const deltaY    = toY(lastV)

  // ── X axis label indices ───────────────────────────────────────────────────
  const labelIdx = new Set<number>([0, lastIdx])
  if (dp.length > 2) {
    const step = Math.floor(dp.length / 3)
    if (step > 0)           labelIdx.add(step)
    if (step * 2 < lastIdx) labelIdx.add(step * 2)
  }

  // ── Tooltip ────────────────────────────────────────────────────────────────
  const hovP  = hoveredIdx !== null ? dp[hoveredIdx] : null
  const tipCx = hoveredIdx !== null ? toX(hoveredIdx) : 0
  const tipCy = hoveredIdx !== null ? toY(dp[hoveredIdx]!.v) : 0
  const tipX  = Math.max(0, Math.min(VW - TIP_W, tipCx - TIP_W / 2))
  const tipY  = tipCy - TIP_H - TIP_GAP < PAD_T
    ? tipCy + TIP_GAP
    : tipCy - TIP_H - TIP_GAP

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width="100%"
      height="120"
      preserveAspectRatio="xMinYMid meet"
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        {/* Gradient fill under the line — switches color based on trend */}
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={gradColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={gradColor} stopOpacity="0"    />
        </linearGradient>
      </defs>

      {/* Y axis labels */}
      <text
        x={PAD_L - 5} y={PAD_T + CHART_H}
        textAnchor="end" dominantBaseline="auto"
        fontSize="11" fill="#888"
        fontFamily="DM Sans, system-ui, sans-serif"
      >
        {minV.toFixed(1)}
      </text>
      <text
        x={PAD_L - 5} y={PAD_T}
        textAnchor="end" dominantBaseline="hanging"
        fontSize="11" fill="#888"
        fontFamily="DM Sans, system-ui, sans-serif"
      >
        {maxV.toFixed(1)}
      </text>

      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      {/* Line */}
      <path
        d={lineSegments}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Open circle dots + 20px hit areas */}
      {dp.map((p, i) => {
        const cx = toX(i)
        const cy = toY(p.v)
        return (
          <g
            key={i}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Invisible hit area */}
            <circle cx={cx.toFixed(1)} cy={cy.toFixed(1)} r="10" fill="transparent" />
            {/* Open circle dot */}
            <circle
              cx={cx.toFixed(1)}
              cy={cy.toFixed(1)}
              r="4"
              fill="white"
              stroke={lineColor}
              strokeWidth="2"
              pointerEvents="none"
            />
          </g>
        )
      })}

      {/* Delta label */}
      <text
        x={deltaX.toFixed(1)} y={deltaY.toFixed(1)}
        dominantBaseline="middle"
        fontSize="12"
        fill={deltaColor}
        fontFamily="DM Sans, system-ui, sans-serif"
      >
        {deltaStr}
      </text>

      {/* X axis date labels */}
      {dp.map((p, i) => {
        if (!labelIdx.has(i)) return null
        const anchor = i === 0 ? 'start' : i === lastIdx ? 'end' : 'middle'
        return (
          <text
            key={i}
            x={toX(i).toFixed(1)} y={VH - 2}
            textAnchor={anchor}
            fontSize="11" fill="#888"
            fontFamily="DM Sans, system-ui, sans-serif"
          >
            {fmtShort(p.logged_at)}
          </text>
        )
      })}

      {/* Hover tooltip */}
      {hovP !== null && hoveredIdx !== null && (
        <foreignObject x={tipX} y={tipY} width={TIP_W} height={TIP_H + 4}>
          <div
            style={{
              background:    '#fff',
              borderRadius:  '8px',
              boxShadow:     '0 2px 8px rgba(0,0,0,0.13)',
              padding:       '6px 10px',
              fontFamily:    'DM Sans, system-ui, sans-serif',
              fontSize:      '12px',
              color:         '#1a1a1a',
              pointerEvents: 'none',
              whiteSpace:    'nowrap',
              display:       'inline-block',
            }}
          >
            <div style={{ fontWeight: 500 }}>{hovP.v.toFixed(1)} {unit}</div>
            <div style={{ color: '#888', marginTop: '2px' }}>{fmtLong(hovP.logged_at)}</div>
          </div>
        </foreignObject>
      )}
    </svg>
  )
}
