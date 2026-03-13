'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Sex = 'male' | 'female' | null
type ActivityLevel = '0' | '1' | '2' | '3' | '4' | '5+' | null
type ScreenTime = '<1' | '1-2' | '2-3' | '3-4' | '>4' | null
type FastFood = '0' | '1' | '2' | '3' | '4+' | null
type FamilyHistory = 'none' | 'one' | 'both' | null
type WeightUnit = 'kg' | 'lbs'
type HeightUnit = 'cm' | 'in'
type Country = 'SA' | 'AE' | null

interface FormState {
  country: Country
  sex: Sex
  age: number | null
  weightValue: string
  weightUnit: WeightUnit
  heightValue: string
  heightUnit: HeightUnit
  activity: ActivityLevel
  screenTime: ScreenTime
  fastFood: FastFood
  familyHistory: FamilyHistory
  notes: string
}

// ─── Tap Button Helper ────────────────────────────────────────────────────────

function TapButton({
  label,
  selected,
  onClick,
  wide = false,
}: {
  label: string
  selected: boolean
  onClick: () => void
  wide?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        ${wide ? 'px-6' : 'px-4'} py-3 rounded-xl font-semibold text-sm border-2 transition-all
        ${selected
          ? 'bg-teal-600 border-teal-600 text-white shadow-md scale-[1.03]'
          : 'bg-white border-gray-200 text-gray-700 hover:border-teal-400 hover:text-teal-700'
        }
      `}
    >
      {label}
    </button>
  )
}

// ─── Unit Toggle Helper ───────────────────────────────────────────────────────

function UnitToggle({
  value,
  options,
  onChange,
}: {
  value: string
  options: [string, string]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 w-fit">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 text-xs font-semibold transition ${
            value === opt
              ? 'bg-teal-600 text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
      <div
        className="bg-teal-500 h-2 rounded-full transition-all duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
      {children}
    </p>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function AssessmentForm() {
  const [form, setForm] = useState<FormState>({
    country: null,
    sex: null,
    age: null,
    weightValue: '',
    weightUnit: 'kg',
    heightValue: '',
    heightUnit: 'cm',
    activity: null,
    screenTime: null,
    fastFood: null,
    familyHistory: null,
    notes: '',
  })

  const [loading, setLoading] = useState(false)

  // ── Unit conversion helpers ──────────────────────────────────────────────

  const handleWeightUnitToggle = (unit: string) => {
    const newUnit = unit as WeightUnit
    const val = parseFloat(form.weightValue)
    if (!isNaN(val)) {
      const converted =
        newUnit === 'lbs' ? (val * 2.20462).toFixed(1) : (val / 2.20462).toFixed(1)
      setForm((f) => ({ ...f, weightUnit: newUnit, weightValue: converted }))
    } else {
      setForm((f) => ({ ...f, weightUnit: newUnit }))
    }
  }

  const handleHeightUnitToggle = (unit: string) => {
    const newUnit = unit as HeightUnit
    const val = parseFloat(form.heightValue)
    if (!isNaN(val)) {
      const converted =
        newUnit === 'in' ? (val / 2.54).toFixed(1) : (val * 2.54).toFixed(1)
      setForm((f) => ({ ...f, heightUnit: newUnit, heightValue: converted }))
    } else {
      setForm((f) => ({ ...f, heightUnit: newUnit }))
    }
  }

  // ── BMI calculation (display only — not the clinical engine) ────────────

  const getWeightKg = () => {
    const val = parseFloat(form.weightValue)
    if (isNaN(val)) return null
    return form.weightUnit === 'lbs' ? val / 2.20462 : val
  }

  const getHeightM = () => {
    const val = parseFloat(form.heightValue)
    if (isNaN(val)) return null
    return form.heightUnit === 'in' ? (val * 2.54) / 100 : val / 100
  }

  const bmi = (() => {
    const w = getWeightKg()
    const h = getHeightM()
    if (!w || !h) return null
    return (w / (h * h)).toFixed(1)
  })()

  // ── Progress calculation ─────────────────────────────────────────────────

  const fields = [
    form.country,
    form.sex,
    form.age,
    form.weightValue,
    form.heightValue,
    form.activity,
    form.screenTime,
    form.fastFood,
    form.familyHistory,
  ]
  const filled = fields.filter(Boolean).length
  const progress = Math.round((filled / fields.length) * 100)

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // TODO: save to Supabase + call AI report generator
    console.log('Assessment data:', form, 'BMI:', bmi)
    setLoading(false)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Assessment Progress</span>
          <span>{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      {/* Country */}
      <div>
        <SectionLabel>Country</SectionLabel>
        <div className="flex gap-3">
          <TapButton label="🇸🇦 Saudi Arabia" selected={form.country === 'SA'} onClick={() => setForm((f) => ({ ...f, country: 'SA' }))} wide />
          <TapButton label="🇦🇪 UAE" selected={form.country === 'AE'} onClick={() => setForm((f) => ({ ...f, country: 'AE' }))} wide />
        </div>
      </div>

      {/* Sex */}
      <div>
        <SectionLabel>Sex</SectionLabel>
        <div className="flex gap-3">
          <TapButton label="♂ Male" selected={form.sex === 'male'} onClick={() => setForm((f) => ({ ...f, sex: 'male' }))} wide />
          <TapButton label="♀ Female" selected={form.sex === 'female'} onClick={() => setForm((f) => ({ ...f, sex: 'female' }))} wide />
        </div>
      </div>

      {/* Age */}
      <div>
        <SectionLabel>Age (years)</SectionLabel>
        {/* Quick-tap grid for 12–30, manual entry for all ages */}
        <div className="grid grid-cols-6 gap-2 mb-3">
          {[12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30].map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setForm((f) => ({ ...f, age: a }))}
              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all
                ${form.age === a
                  ? 'bg-teal-600 border-teal-600 text-white'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-teal-400'
                }`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <input
            type="number"
            min={12}
            max={120}
            placeholder="Or type any age (12–120)"
            value={form.age ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, age: parseInt(e.target.value) || null }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <span className="text-sm text-gray-400 whitespace-nowrap">yrs</span>
        </div>
        {form.age && form.age >= 12 && form.age < 18 && (
          <p className="text-xs text-amber-600 mt-2 font-medium">⚠️ Adolescent (12–17): WHO 2007 growth charts will apply</p>
        )}
      </div>

      {/* Weight */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Weight</SectionLabel>
          <UnitToggle value={form.weightUnit} options={['kg', 'lbs']} onChange={handleWeightUnitToggle} />
        </div>
        <input
          type="number"
          step="0.1"
          min="20"
          placeholder={form.weightUnit === 'kg' ? 'e.g. 92.5' : 'e.g. 204.0'}
          value={form.weightValue}
          onChange={(e) => setForm((f) => ({ ...f, weightValue: e.target.value }))}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Height */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Height</SectionLabel>
          <UnitToggle value={form.heightUnit} options={['cm', 'in']} onChange={handleHeightUnitToggle} />
        </div>
        <input
          type="number"
          step="0.1"
          min="100"
          placeholder={form.heightUnit === 'cm' ? 'e.g. 170' : 'e.g. 67.0'}
          value={form.heightValue}
          onChange={(e) => setForm((f) => ({ ...f, heightValue: e.target.value }))}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Live BMI preview */}
      {bmi && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-4 flex items-center justify-between">
          <span className="text-sm text-teal-700 font-medium">Calculated BMI</span>
          <span className="text-2xl font-bold text-teal-700">{bmi}</span>
        </div>
      )}

      {/* Physical Activity */}
      <div>
        <SectionLabel>Physical Activity (days/week)</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {(['0', '1', '2', '3', '4', '5+'] as ActivityLevel[]).map((v) => (
            <TapButton key={v} label={v === '0' ? 'None' : `${v}×`} selected={form.activity === v} onClick={() => setForm((f) => ({ ...f, activity: v }))} />
          ))}
        </div>
      </div>

      {/* Screen Time */}
      <div>
        <SectionLabel>Screen Time (hrs/day)</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {(['<1', '1-2', '2-3', '3-4', '>4'] as ScreenTime[]).map((v) => (
            <TapButton key={v!} label={`${v} hr`} selected={form.screenTime === v} onClick={() => setForm((f) => ({ ...f, screenTime: v }))} />
          ))}
        </div>
      </div>

      {/* Fast Food */}
      <div>
        <SectionLabel>Fast Food / Takeaway (times/week)</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {(['0', '1', '2', '3', '4+'] as FastFood[]).map((v) => (
            <TapButton key={v!} label={v === '0' ? 'Never' : `${v}×`} selected={form.fastFood === v} onClick={() => setForm((f) => ({ ...f, fastFood: v }))} />
          ))}
        </div>
      </div>

      {/* Family History */}
      <div>
        <SectionLabel>Family History of Obesity</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <TapButton label="None" selected={form.familyHistory === 'none'} onClick={() => setForm((f) => ({ ...f, familyHistory: 'none' }))} />
          <TapButton label="One Parent" selected={form.familyHistory === 'one'} onClick={() => setForm((f) => ({ ...f, familyHistory: 'one' }))} wide />
          <TapButton label="Both Parents" selected={form.familyHistory === 'both'} onClick={() => setForm((f) => ({ ...f, familyHistory: 'both' }))} wide />
        </div>
      </div>

      {/* Clinical Notes */}
      <div>
        <SectionLabel>Clinical Notes (optional)</SectionLabel>
        <textarea
          rows={3}
          placeholder="Comorbidities, medications, relevant history..."
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </div>

      {/* KSA GLP-1 guardrail — physician-only private alert */}
      {form.country === 'SA' && form.age && form.age < 18 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4">
          <p className="text-amber-800 text-sm font-semibold">⚕️ KSA Clinical Alert</p>
          <p className="text-amber-700 text-xs mt-1">
            GLP-1 agents (semaglutide, liraglutide) are <strong>NOT SFDA-approved</strong> for pediatric obesity in KSA as of March 2026. This alert is visible to physicians only and will not appear in any parent-facing report.
          </p>
        </div>
      )}

      {form.country === 'AE' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
          <p className="text-blue-800 text-sm font-semibold">🇦🇪 UAE GLP-1 Note</p>
          <p className="text-blue-700 text-xs mt-1">
            Wegovy (semaglutide) and Saxenda (liraglutide) have differing MOHAP approval statuses. Any GLP-1 mention in UAE reports is flagged for your explicit clinical review before delivery.
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || progress < 80}
        className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold text-base hover:bg-teal-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading
          ? 'Generating AI Report...'
          : progress < 80
          ? `Complete assessment to continue (${progress}%)`
          : 'Save & Generate AI Report →'}
      </button>

    </form>
  )
}
