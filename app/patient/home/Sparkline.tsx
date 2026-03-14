'use client'

interface Point { label: string; value: number }

interface SparklineProps {
  points: Point[]   // first point should be enrollment weight ("Start")
  unit:   'kg' | 'lbs'
}

const KG_TO_LBS = 2.20462

export function Sparkline({ points, unit }: SparklineProps) {
  if (points.length < 1) return null

  const displayed = points.map(p => ({
    label: p.label,
    value: unit === 'lbs' ? Math.round(p.value * KG_TO_LBS * 10) / 10 : p.value,
  }))

  const values  = displayed.map(p => p.value)
  const minVal  = Math.min(...values)
  const maxVal  = Math.max(...values)
  const range   = maxVal - minVal || 1

  const W = 300
  const H = 56
  const PAD = 8

  const x = (i: number) =>
    points.length === 1
      ? W / 2
      : PAD + (i / (points.length - 1)) * (W - PAD * 2)

  const y = (v: number) =>
    PAD + (1 - (v - minVal) / range) * (H - PAD * 2)

  const pathD = displayed
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`)
    .join(' ')

  return (
    <div className="space-y-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 56 }}
        aria-hidden="true"
      >
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#1D9E75"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {displayed.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={i === 0 ? 4 : 3}
            fill={i === 0 ? '#0D5C45' : '#1D9E75'}
            stroke="#FAFAF8"
            strokeWidth="1.5"
          />
        ))}
      </svg>

      {/* Labels: Start ... latest */}
      <div className="flex justify-between text-xs font-dm-sans text-gray-400 px-0.5">
        <span>
          Start&nbsp;
          <span className="text-gray-600 font-medium">
            {displayed[0].value}{unit}
          </span>
        </span>
        {displayed.length > 1 && (
          <span>
            Now&nbsp;
            <span className="text-gray-600 font-medium">
              {displayed[displayed.length - 1].value}{unit}
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
