'use client'

import { useState, useMemo } from 'react'
import { calculateRisk } from '@/lib/riskCalculator'
import type { GenerateReportResponse } from '@/app/api/generate-report/route'
import RiskResultCard from './RiskResult'

// ─── Report tab type (module-level — not inside the component) ────────────────
type ReportTab = 'physician-en' | 'physician-ar' | 'patient-en' | 'patient-ar'

// ─── Types ────────────────────────────────────────────────────────────────────

type Sex = 'male' | 'female' | null
type ActivityLevel = '0' | '1' | '2' | '3' | '4' | '5+' | null
type ScreenTime = '<1' | '1-2' | '2-3' | '3-4' | '>4' | null
type FastFood = '0' | '1' | '2' | '3' | '4+' | null
type FamilyHistory = 'none' | 'one' | 'both' | null
type Comorbidity = 'hypertension' | 'type2_diabetes' | 'high_cholesterol'
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
  waistValue: string
  activity: ActivityLevel
  screenTime: ScreenTime
  fastFood: FastFood
  familyHistory: FamilyHistory
  comorbidities: Comorbidity[] | null   // null = unanswered; [] = none
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
    waistValue: '',
    activity: null,
    screenTime: null,
    fastFood: null,
    familyHistory: null,
    comorbidities: null,
    notes: '',
  })

  const [showResult, setShowResult] = useState(false)

  // ── Report state ─────────────────────────────────────────────────────────
  const [report, setReport] = useState<GenerateReportResponse | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ReportTab>('physician-en')

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
    form.country, form.sex, form.age,
    form.weightValue, form.heightValue,
    form.activity, form.screenTime,
    form.fastFood, form.familyHistory,
    form.comorbidities,  // null = unanswered, [] or [...] = answered
  ]
  const filled = fields.filter(Boolean).length
  const progress = Math.round((filled / fields.length) * 100)

  // ── Live risk result ────────────────────────────────────────────────────

  const riskResult = useMemo(() => {
    const wRaw = parseFloat(form.weightValue)
    const hRaw = parseFloat(form.heightValue)
    if (isNaN(wRaw) || isNaN(hRaw)) return null
    const wKg = form.weightUnit === 'lbs' ? wRaw / 2.20462 : wRaw
    const hM  = form.heightUnit === 'in'  ? (hRaw * 2.54) / 100 : hRaw / 100
    if (
      !wKg || !hM || !form.sex || !form.age || !form.country ||
      !form.activity || !form.screenTime || !form.fastFood || !form.familyHistory
    ) return null
    const bmiVal = wKg / (hM * hM)
    const waistRaw = parseFloat(form.waistValue)
    return calculateRisk({
      bmi: bmiVal,
      sex: form.sex,
      age: form.age,
      waistCm: !isNaN(waistRaw) ? waistRaw : undefined,
      activity: form.activity,
      screenTime: form.screenTime,
      fastFood: form.fastFood,
      familyHistory: form.familyHistory,
      country: form.country,
      comorbidities: (form.comorbidities ?? []) as ('hypertension' | 'type2_diabetes' | 'high_cholesterol')[],
    })
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    form.weightValue, form.weightUnit, form.heightValue, form.heightUnit,
    form.waistValue, form.sex, form.age, form.country,
    form.activity, form.screenTime, form.fastFood, form.familyHistory,
    form.comorbidities,
  ])

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!riskResult || !form.sex || !form.age || !form.country) return

    // Risk result is already computed live via useMemo — show it immediately
    setShowResult(true)
    setReport(null)
    setReportError(null)
    setActiveTab('physician-en')

    // ── Call AI report generator (separate loading state from form submit) ──
    setReportLoading(true)
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riskResult,
          sex:           form.sex,
          age:           form.age,
          country:       form.country,
          patientRef:    null,
          clinicalNotes: form.notes?.trim() || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data: GenerateReportResponse = await res.json()
      setReport(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('[AssessmentForm] report error:', message)
      setReportError('Report generation failed. Please try again.')
    } finally {
      setReportLoading(false)
    }
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
            onWheel={(e) => e.currentTarget.blur()}
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
          onWheel={(e) => e.currentTarget.blur()}
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
          onWheel={(e) => e.currentTarget.blur()}
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

      {/* Waist Circumference (optional) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Waist Circumference <span className="text-gray-300 font-normal normal-case tracking-normal">(optional)</span></SectionLabel>
          <span className="text-xs text-gray-400">cm</span>
        </div>
        <input
          type="number"
          step="0.1"
          min="40"
          max="200"
          placeholder="e.g. 94 cm — improves risk accuracy"
          value={form.waistValue}
          onChange={(e) => setForm((f) => ({ ...f, waistValue: e.target.value }))}
          onWheel={(e) => e.currentTarget.blur()}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          IDF 2006 thresholds: Men ≥94 cm, Women ≥80 cm indicates central adiposity <span className="text-amber-500">[VERIFY]</span>
        </p>
      </div>

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

      {/* Weight-Related Comorbidities */}
      <div>
        <SectionLabel>Weight-Related Conditions</SectionLabel>
        <p className="text-xs text-gray-400 mb-3">Select all that apply — or tap &quot;None&quot; if none are present</p>
        <div className="flex flex-wrap gap-2">
          {/* "None" clears all selections */}
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, comorbidities: [] }))}
            className={`
              px-4 py-3 rounded-xl font-semibold text-sm border-2 transition-all
              ${form.comorbidities !== null && form.comorbidities.length === 0
                ? 'bg-teal-600 border-teal-600 text-white shadow-md scale-[1.03]'
                : 'bg-white border-gray-200 text-gray-700 hover:border-teal-400 hover:text-teal-700'
              }
            `}
          >
            None
          </button>
          {(
            [
              { value: 'hypertension',    label: 'Hypertension' },
              { value: 'type2_diabetes',  label: 'Type 2 Diabetes' },
              { value: 'high_cholesterol', label: 'High Cholesterol' },
            ] as { value: Comorbidity; label: string }[]
          ).map(({ value, label }) => {
            const selected = form.comorbidities?.includes(value) ?? false
            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setForm((f) => {
                    const current = f.comorbidities ?? []
                    const updated = current.includes(value)
                      ? current.filter((c) => c !== value)
                      : [...current, value]
                    return { ...f, comorbidities: updated }
                  })
                }
                className={`
                  px-4 py-3 rounded-xl font-semibold text-sm border-2 transition-all
                  ${selected
                    ? 'bg-teal-600 border-teal-600 text-white shadow-md scale-[1.03]'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-teal-400 hover:text-teal-700'
                  }
                `}
              >
                {label}
              </button>
            )
          })}
        </div>
        {form.comorbidities === null && (
          <p className="text-xs text-amber-500 mt-2">Please indicate whether any conditions are present</p>
        )}
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
        disabled={progress < 80}
        className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold text-base hover:bg-teal-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {progress < 80
          ? `Complete assessment to continue (${progress}%)`
          : 'Calculate Risk & Generate Report →'}
      </button>

      {/* Risk Result — shown after submit */}
      {showResult && riskResult && (
        <div className="border-t border-gray-200 pt-8 space-y-8">
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Clinical Risk Summary</h3>
            <RiskResultCard result={riskResult} />
          </div>

          {/* AI Report Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">🗒 AI-Generated Reports</h3>
            <p className="text-xs text-gray-500 mb-4">
              {reportLoading
                ? 'Generating reports…'
                : report
                ? 'Select a report below to view or print.'
                : reportError
                ? reportError
                : null}
            </p>

            {/* Loading spinner */}
            {reportLoading && (
              <div className="flex items-center justify-center py-10 text-teal-600">
                <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="text-sm font-medium">Generating AI reports…</span>
              </div>
            )}

            {/* Error state */}
            {reportError && !reportLoading && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-700 text-sm">
                {reportError}
              </div>
            )}

            {/* Report tabs */}
            {report && !reportLoading && (
              <div className="space-y-4">
                {/* Tab bar */}
                <div className="flex gap-2 flex-wrap">
                  {(
                    [
                      { key: 'physician-en', label: '⚕️ Physician (EN)' },
                      { key: 'physician-ar', label: '⚕️ Physician (AR)' },
                      { key: 'patient-en',   label: '🧑 Patient (EN)' },
                      { key: 'patient-ar',   label: '🧑 Patient (AR)' },
                    ] as { key: ReportTab; label: string }[]
                  ).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        activeTab === key
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Report body */}
                <div
                  dir={activeTab.endsWith('-ar') ? 'rtl' : 'ltr'}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-[inherit]"
                >
                  {activeTab === 'physician-en' && report.reportPhysicianEn}
                  {activeTab === 'physician-ar' && report.reportPhysicianAr}
                  {activeTab === 'patient-en'   && report.reportPatientEn}
                  {activeTab === 'patient-ar'   && report.reportPatientAr}
                </div>

                {/* Print button */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="text-sm text-teal-600 hover:underline"
                >
                  🖨 Print this report
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </form>
  )
}
