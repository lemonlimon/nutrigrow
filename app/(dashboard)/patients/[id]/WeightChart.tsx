// Pure SVG weight chart — no client directive needed, no dependencies.

interface WeightPoint {
  weight_kg: number
  logged_at: string
}

interface WeightChartProps {
  points: WeightPoint[]   // expected in ascending date order
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function WeightChart({ points }: WeightChartProps) {
  if (points.length < 2) return null

  // ── Layout constants ──────────────────────────────────────────────────────
  const VW   = 400   // viewBox width
  const VH   = 160   // viewBox height
  const padL = 38    // left margin — room for Y axis labels
  const padR = 10    // right margin
  const padT = 12    // top margin
  const padB = 28    // bottom margin — room for X axis labels

  const chartW = VW - padL - padR   // 352px of drawable width
  const chartH = VH - padT - padB   // 120px of drawable height

  // ── Scale ─────────────────────────────────────────────────────────────────
  const weights  = points.map(p => Number(p.weight_kg))
  const minW     = Math.min(...weights)
  const maxW     = Math.max(...weights)
  // When all weights are the same, add ±6 kg padding so the line sits in the
  // middle of the chart instead of flatlining at the bottom edge.
  const padding  = maxW === minW ? 5 : 0
  const chartMin = minW - padding - 1
  const chartMax = maxW + padding + 1
  const rangeAdj = chartMax - chartMin

  const toX = (i: number) =>
    padL + (i / (points.length - 1)) * chartW

  const toY = (w: number) =>
    padT + chartH - ((w - chartMin) / rangeAdj) * chartH

  // ── SVG path for the line ─────────────────────────────────────────────────
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.weight_kg).toFixed(1)}`)
    .join(' ')

  // ── Which X labels to show (first, last, and up to 2 middle) ─────────────
  const labelIndices = new Set<number>([0, points.length - 1])
  if (points.length > 2) {
    const step = Math.floor(points.length / 3)
    if (step > 0) labelIndices.add(step)
    if (step * 2 < points.length - 1) labelIndices.add(step * 2)
  }

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width="100%"
      height="120"
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Y axis: min and max weight labels */}
      <text
        x={padL - 5} y={padT + chartH}
        textAnchor="end" dominantBaseline="auto"
        fontSize="11" fill="#888"
        fontFamily="DM Sans, system-ui, sans-serif"
      >
        {minW.toFixed(1)}
      </text>
      <text
        x={padL - 5} y={padT + 4}
        textAnchor="end" dominantBaseline="hanging"
        fontSize="11" fill="#888"
        fontFamily="DM Sans, system-ui, sans-serif"
      >
        {maxW.toFixed(1)}
      </text>

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="#1D9E75"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={toX(i).toFixed(1)}
          cy={toY(p.weight_kg).toFixed(1)}
          r="4"
          fill="#0D5C45"
        />
      ))}

      {/* X axis date labels */}
      {points.map((p, i) => {
        if (!labelIndices.has(i)) return null
        const x       = toX(i)
        const anchor  = i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'
        return (
          <text
            key={i}
            x={x.toFixed(1)} y={VH - 4}
            textAnchor={anchor}
            fontSize="11" fill="#888"
            fontFamily="DM Sans, system-ui, sans-serif"
          >
            {formatDate(p.logged_at)}
          </text>
        )
      })}
    </svg>
  )
}
