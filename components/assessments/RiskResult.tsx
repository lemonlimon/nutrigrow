'use client'

import type { RiskResult } from '@/lib/riskCalculator'

interface Props {
  result: RiskResult
}

const tierStyles = {
  'low':       { bg: 'bg-green-50',  border: 'border-green-300',  text: 'text-green-800',  badge: 'bg-green-100 text-green-800',  dot: 'bg-green-500'  },
  'moderate':  { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  'high':      { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  'very-high': { bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-800',    badge: 'bg-red-100 text-red-800',       dot: 'bg-red-500'    },
}

const colorDot: Record<string, string> = {
  green:  'bg-green-500',
  yellow: 'bg-yellow-400',
  red:    'bg-red-500',
}

export default function RiskResultCard({ result }: Props) {
  const styles = tierStyles[result.riskTier]
  const { bmiClassification: bmi } = result

  return (
    <div className="space-y-6 mt-2">

      {/* ── Physician Alert (KSA/UAE) ─────────────────────────────────────── */}
      {result.physicianAlert && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4">
          <p className="text-amber-800 text-sm font-semibold">Physician-Only Alert</p>
          <p className="text-amber-700 text-xs mt-1">{result.physicianAlert}</p>
        </div>
      )}

      {/* ── Traffic Light + Risk Tier ─────────────────────────────────────── */}
      <div className={`${styles.bg} ${styles.border} border rounded-2xl px-6 py-5`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
              Overall Risk
            </p>
            <p className={`text-2xl font-bold ${styles.text}`}>{result.riskLabel}</p>
            <p className="text-sm text-gray-500 mt-1">
              Score: {result.riskScore} / {result.maxScore} points
            </p>
          </div>
          {/* Traffic Light */}
          <div className="flex flex-col items-center gap-1.5 bg-gray-900 rounded-xl px-3 py-3">
            {(['green', 'yellow', 'red'] as const).map((c) => (
              <div
                key={c}
                className={`w-6 h-6 rounded-full transition-all ${
                  result.trafficLight === c ? colorDot[c] + ' opacity-100 scale-110' : 'bg-gray-700 opacity-40'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── BMI Comparison Table ──────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-800">
            BMI Comparison — {bmi.bmi.toFixed(1)} kg/m²
          </p>
        </div>

        {/* Table */}
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Standard</th>
              <th className="text-left px-5 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Category</th>
              <th className="text-left px-5 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Range</th>
              <th className="text-left px-5 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100">
              <td className="px-5 py-3 font-medium text-gray-700">WHO Standard</td>
              <td className="px-5 py-3 text-gray-600">{bmi.who.category}</td>
              <td className="px-5 py-3 text-gray-400 text-xs">{bmi.who.range}</td>
              <td className="px-5 py-3">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
                  ${bmi.who.color === 'green'  ? 'bg-green-100 text-green-700'  : ''}
                  ${bmi.who.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' : ''}
                  ${bmi.who.color === 'red'    ? 'bg-red-100 text-red-700'    : ''}
                `}>
                  <span className={`w-2 h-2 rounded-full ${colorDot[bmi.who.color]}`} />
                  {bmi.who.color === 'green' ? 'Normal' : bmi.who.color === 'yellow' ? 'Elevated' : 'High'}
                </span>
              </td>
            </tr>
            <tr className="border-t border-gray-100 bg-teal-50/40">
              <td className="px-5 py-3 font-medium text-gray-700">
                Gulf-Adjusted
                <span className="ml-1 text-xs text-teal-600 font-normal">(recommended)</span>
              </td>
              <td className="px-5 py-3 text-gray-600">{bmi.gulf.category}</td>
              <td className="px-5 py-3 text-gray-400 text-xs">{bmi.gulf.range}</td>
              <td className="px-5 py-3">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
                  ${bmi.gulf.color === 'green'  ? 'bg-green-100 text-green-700'  : ''}
                  ${bmi.gulf.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' : ''}
                  ${bmi.gulf.color === 'red'    ? 'bg-red-100 text-red-700'    : ''}
                `}>
                  <span className={`w-2 h-2 rounded-full ${colorDot[bmi.gulf.color]}`} />
                  {bmi.gulf.color === 'green' ? 'Normal' : bmi.gulf.color === 'yellow' ? 'Elevated' : 'High'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Citations */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400 leading-relaxed">
            <span className="font-semibold">WHO Standard:</span> WHO Technical Report Series 894 (2000). &nbsp;
            <span className="font-semibold">Gulf-Adjusted:</span> WHO Expert Consultation, <em>The Lancet</em> 363(9403):157–163 (2004) — Asian population thresholds, adapted for Gulf context <span className="text-amber-600">[VERIFY vs Saudi MOH CPG]</span>.
          </p>
        </div>
      </div>

      {/* ── Risk Factor Breakdown ─────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-800">Risk Factor Breakdown</p>
        </div>
        <div className="divide-y divide-gray-100">
          {result.riskFactors.map((f) => (
            <div key={f.label} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className={`text-sm font-medium ${f.flag ? 'text-red-700' : 'text-gray-700'}`}>
                  {f.flag && '⚠️ '}{f.label}
                </p>
                <p className="text-xs text-gray-400">{f.value}</p>
                {f.note && <p className="text-xs text-amber-600 mt-0.5">{f.note}</p>}
              </div>
              <div className={`text-sm font-bold px-3 py-1 rounded-full ${
                f.points === 0 ? 'bg-green-100 text-green-700' :
                f.points <= 2  ? 'bg-yellow-100 text-yellow-700' :
                                 'bg-red-100 text-red-700'
              }`}>
                +{f.points}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recommendations ───────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-800">Clinical Recommendations</p>
        </div>
        <ul className="divide-y divide-gray-100">
          {result.recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-3 px-5 py-3">
              <span className="text-teal-500 mt-0.5 font-bold text-sm">→</span>
              <p className="text-sm text-gray-700">{r}</p>
            </li>
          ))}
        </ul>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            References: AAP CPG 2023 (Pediatrics 151(2):e2022060640) · Saudi MOH Childhood Obesity CPG · WHO Physical Activity Guidelines 2020 · IDF Metabolic Syndrome Consensus 2006
          </p>
        </div>
      </div>

      {/* ── Parent-Facing Traffic Light Preview ──────────────────────────── */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
          Patient-Facing Report Preview
        </p>
        <div className={`rounded-xl px-5 py-4 border-2 flex items-center gap-4
          ${result.trafficLight === 'green'  ? 'bg-green-50 border-green-300'  : ''}
          ${result.trafficLight === 'yellow' ? 'bg-yellow-50 border-yellow-300' : ''}
          ${result.trafficLight === 'red'    ? 'bg-red-50 border-red-300'    : ''}
        `}>
          <div className={`w-10 h-10 rounded-full flex-shrink-0 ${colorDot[result.trafficLight]}`} />
          <div>
            <p className="font-bold text-gray-800 text-sm">
              {result.trafficLight === 'green'  ? 'Your health profile looks good. Keep it up!' : ''}
              {result.trafficLight === 'yellow' ? 'Some areas need attention. Your doctor will guide you.' : ''}
              {result.trafficLight === 'red'    ? 'Your doctor has identified areas that need care. A plan is being prepared for you.' : ''}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              This message will appear in the patient report (English + Arabic).
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
