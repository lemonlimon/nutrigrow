'use client'

import { useState, useMemo } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────
type Sex           = 'male' | 'female'
type Language      = 'en' | 'ar'
type ContactMethod = 'email' | 'sms'
type WeightUnit    = 'kg' | 'lbs'
type LengthUnit    = 'cm' | 'in'
type FormStage     = 'form' | 'submitting' | 'confirmed'

interface FormState {
  sex:           Sex | null
  age:           string
  weightValue:   string
  weightUnit:    WeightUnit
  heightValue:   string
  heightUnit:    LengthUnit
  waistValue:    string
  waistUnit:     LengthUnit
  firstName:     string
  contactMethod: ContactMethod
  contactValue:  string
  language:      Language | null
}

interface ConfirmedData {
  firstName:  string
  inviteLink: string
}

// ── Unit conversion ────────────────────────────────────────────────────────────
const KG_TO_LBS = 2.20462
const LBS_TO_KG = 0.453592
const CM_TO_IN  = 0.393701
const IN_TO_CM  = 2.54

function convertWeight(value: string, from: WeightUnit, to: WeightUnit): string {
  if (value === '' || from === to) return value
  const n = parseFloat(value)
  if (isNaN(n)) return ''
  const result = from === 'kg' ? n * KG_TO_LBS : n * LBS_TO_KG
  return String(Math.round(result * 10) / 10)
}

function convertLength(value: string, from: LengthUnit, to: LengthUnit): string {
  if (value === '' || from === to) return value
  const n = parseFloat(value)
  if (isNaN(n)) return ''
  const result = from === 'cm' ? n * CM_TO_IN : n * IN_TO_CM
  return String(Math.round(result * 10) / 10)
}

// ── Validation helpers ─────────────────────────────────────────────────────────
function isAgeValid(age: string): boolean {
  const n = parseInt(age, 10)
  return !isNaN(n) && n >= 18 && n <= 75
}

function isMeasurementFilled(value: string): boolean {
  const n = parseFloat(value)
  return value !== '' && !isNaN(n) && n > 0
}

// ── Initial state ──────────────────────────────────────────────────────────────
const INITIAL: FormState = {
  sex:           null,
  age:           '',
  weightValue:   '',
  weightUnit:    'kg',
  heightValue:   '',
  heightUnit:    'cm',
  waistValue:    '',
  waistUnit:     'cm',
  firstName:     '',
  contactMethod: 'email',
  contactValue:  '',
  language:      null,
}

// ── Shared styles ──────────────────────────────────────────────────────────────
const inputCls =
  'w-full px-4 py-3 rounded-btn border border-gray-200 text-gray-900 font-dm-sans text-sm ' +
  'focus:outline-none focus:border-brand-dark focus:ring-1 focus:ring-brand-dark ' +
  'placeholder:text-gray-400 transition-colors'

const tapActiveCls   = 'bg-brand-dark text-white border-brand-dark'
const tapInactiveCls = 'bg-white text-gray-700 border-gray-200 hover:border-brand-dark'

// ── MeasurementField ───────────────────────────────────────────────────────────
interface MeasurementFieldProps {
  label:         string
  value:         string
  unitA:         string
  unitB:         string
  activeUnit:    string
  placeholder:   string
  onValueChange: (v: string) => void
  onUnitToggle:  () => void
}

function MeasurementField({
  label, value, unitA, unitB, activeUnit, placeholder, onValueChange, onUnitToggle,
}: MeasurementFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 font-dm-sans">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          value={value}
          onChange={e => onValueChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputCls} flex-1`}
        />
        {/* Inline unit toggle — two segments, no dropdown */}
        <div className="flex rounded-btn border border-gray-200 overflow-hidden shrink-0">
          {[unitA, unitB].map(unit => (
            <button
              key={unit}
              type="button"
              onClick={unit !== activeUnit ? onUnitToggle : undefined}
              className={[
                'px-3 py-2 text-xs font-medium font-dm-sans transition-colors',
                unit === activeUnit
                  ? 'bg-brand-dark text-white'
                  : 'bg-white text-gray-500 hover:bg-brand-light',
              ].join(' ')}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── EnrollmentForm ─────────────────────────────────────────────────────────────
export default function EnrollmentForm() {
  const [form, setForm]           = useState<FormState>(INITIAL)
  const [stage, setStage]         = useState<FormStage>('form')
  const [confirmed, setConfirmed] = useState<ConfirmedData | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [copied, setCopied]       = useState(false)

  // Immutable field update — never mutate state in place
  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  // Unit toggles — convert value and unit atomically in one setState call
  const toggleWeightUnit = () =>
    setForm(prev => {
      const next: WeightUnit = prev.weightUnit === 'kg' ? 'lbs' : 'kg'
      return { ...prev, weightUnit: next, weightValue: convertWeight(prev.weightValue, prev.weightUnit, next) }
    })

  const toggleHeightUnit = () =>
    setForm(prev => {
      const next: LengthUnit = prev.heightUnit === 'cm' ? 'in' : 'cm'
      return { ...prev, heightUnit: next, heightValue: convertLength(prev.heightValue, prev.heightUnit, next) }
    })

  const toggleWaistUnit = () =>
    setForm(prev => {
      const next: LengthUnit = prev.waistUnit === 'cm' ? 'in' : 'cm'
      return { ...prev, waistUnit: next, waistValue: convertLength(prev.waistValue, prev.waistUnit, next) }
    })

  // Switching contact method clears the input so stale email/phone doesn't persist
  const switchContactMethod = (method: ContactMethod) =>
    setForm(prev => ({ ...prev, contactMethod: method, contactValue: '' }))

  // Submit — calls /api/enroll, moves to confirmation screen on success
  async function handleSubmit() {
    setStage('submitting')
    setSubmitError(null)

    try {
      const res  = await fetch('/api/enroll', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json()

      if (!json.success) {
        setSubmitError(json.error ?? 'Something went wrong. Please try again.')
        setStage('form')
        return
      }

      setConfirmed({ firstName: json.data.firstName, inviteLink: json.data.inviteLink })
      setStage('confirmed')
    } catch {
      setSubmitError('Network error. Please check your connection and try again.')
      setStage('form')
    }
  }

  // Copy invite link to clipboard; revert button label after 2 s
  async function copyToClipboard() {
    if (!confirmed) return
    await navigator.clipboard.writeText(confirmed.inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Reset to enroll another patient
  function resetForm() {
    setForm(INITIAL)
    setConfirmed(null)
    setStage('form')
    setSubmitError(null)
    setCopied(false)
  }

  // Progress — 8 fields, each worth one step
  const completedFields = useMemo(() => [
    form.sex !== null,
    isAgeValid(form.age),
    isMeasurementFilled(form.weightValue),
    isMeasurementFilled(form.heightValue),
    isMeasurementFilled(form.waistValue),
    form.firstName.trim() !== '',
    form.contactValue.trim() !== '',
    form.language !== null,
  ], [form])

  const completedCount = completedFields.filter(Boolean).length
  const progressPct    = (completedCount / 8) * 100
  const allFilled      = completedCount === 8
  const isAr           = form.language === 'ar'

  // Dev bypass indicator — baked in at build time from NEXT_PUBLIC_ALLOW_DEV_BYPASS
  const devBypass =
    process.env.NEXT_PUBLIC_ALLOW_DEV_BYPASS === 'true' &&
    process.env.NODE_ENV !== 'production'

  // ── Confirmation screen ────────────────────────────────────────────────────
  if (stage === 'confirmed' && confirmed) {
    return (
      <div className="min-h-screen bg-canvas px-4 py-10">

        {/* Dev mode warning banner */}
        {devBypass && (
          <div className="max-w-lg mx-auto mb-4 bg-yellow-50 border border-yellow-300 rounded-btn px-4 py-2 flex items-center gap-2">
            <span className="text-yellow-700 text-xs font-medium font-dm-sans">
              ⚠ Dev mode — auth bypassed
            </span>
          </div>
        )}

        <div className="max-w-lg mx-auto bg-white rounded-card shadow-sm border border-gray-100 p-8 space-y-6">

          {/* Check mark */}
          <div className="w-12 h-12 rounded-full bg-brand-light flex items-center justify-center">
            <svg
              className="w-6 h-6 text-brand-dark"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <h1 className="font-playfair text-2xl text-gray-900 leading-tight">
              Invitation ready for {confirmed.firstName}
            </h1>
            <p className="text-sm text-gray-400 mt-1 font-dm-sans">
              Share this link with the patient to complete enrollment.
            </p>
          </div>

          {/* Copyable link display */}
          <div className="bg-gray-50 rounded-btn border border-gray-200 px-4 py-3 space-y-1">
            <p className="text-xs text-gray-400 font-dm-sans">Invite link</p>
            <p className="text-sm text-gray-800 font-dm-sans break-all leading-relaxed">
              {confirmed.inviteLink}
            </p>
          </div>

          {/* Copy button */}
          <button
            type="button"
            onClick={copyToClipboard}
            className="w-full py-4 rounded-btn font-medium text-base font-dm-sans transition-all
                       bg-brand-dark text-white hover:opacity-90 active:opacity-95"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>

          {/* Enroll another */}
          <button
            type="button"
            onClick={resetForm}
            className="w-full py-3 rounded-btn border border-gray-200 text-gray-600 text-sm
                       font-medium font-dm-sans hover:border-brand-dark transition-colors"
          >
            Enroll another patient
          </button>

        </div>
      </div>
    )
  }

  // ── Enrollment form ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-canvas px-4 py-10">

      {/* Dev mode warning banner */}
      {devBypass && (
        <div className="max-w-lg mx-auto mb-4 bg-yellow-50 border border-yellow-300 rounded-btn px-4 py-2 flex items-center gap-2">
          <span className="text-yellow-700 text-xs font-medium font-dm-sans">
            ⚠ Dev mode — auth bypassed
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="max-w-lg mx-auto mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-2 font-dm-sans">
          <span>Patient enrollment</span>
          <span>{completedCount} of 8 fields</span>
        </div>
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-dark rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Form card */}
      <div className="max-w-lg mx-auto bg-white rounded-card shadow-sm border border-gray-100 p-6 space-y-6">

        {/* Heading */}
        <div>
          <h1 className="font-playfair text-2xl text-gray-900 leading-tight">
            New Patient
          </h1>
          <p className="text-sm text-gray-400 mt-1 font-dm-sans">
            Baseline measurements and contact details
          </p>
        </div>

        {/* ── Sex ─────────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 font-dm-sans">Sex</label>
          <div className="grid grid-cols-2 gap-3">
            {(['male', 'female'] as Sex[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => patch('sex', s)}
                className={[
                  'py-3 rounded-btn text-sm font-medium font-dm-sans border transition-colors',
                  form.sex === s ? tapActiveCls : tapInactiveCls,
                ].join(' ')}
              >
                {s === 'male' ? 'Male' : 'Female'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Patient first name ───────────────────────────────────────────── */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 font-dm-sans">
            Patient first name
          </label>
          <input
            type="text"
            value={form.firstName}
            onChange={e => patch('firstName', e.target.value)}
            placeholder="First name only"
            autoComplete="off"
            className={inputCls}
          />
        </div>

        {/* ── Age ─────────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 font-dm-sans">Age</label>
          <input
            type="number"
            value={form.age}
            min={18}
            max={75}
            onChange={e => patch('age', e.target.value)}
            placeholder="18 – 75"
            className={inputCls}
          />
        </div>

        {/* ── Weight ──────────────────────────────────────────────────────── */}
        <MeasurementField
          label="Weight"
          value={form.weightValue}
          unitA="kg"
          unitB="lbs"
          activeUnit={form.weightUnit}
          placeholder={form.weightUnit === 'kg' ? '60 – 200' : '132 – 440'}
          onValueChange={v => patch('weightValue', v)}
          onUnitToggle={toggleWeightUnit}
        />

        {/* ── Height ──────────────────────────────────────────────────────── */}
        <MeasurementField
          label="Height"
          value={form.heightValue}
          unitA="cm"
          unitB="in"
          activeUnit={form.heightUnit}
          placeholder={form.heightUnit === 'cm' ? '140 – 220' : '55 – 87'}
          onValueChange={v => patch('heightValue', v)}
          onUnitToggle={toggleHeightUnit}
        />

        {/* ── Waist circumference ──────────────────────────────────────────── */}
        <MeasurementField
          label="Waist circumference"
          value={form.waistValue}
          unitA="cm"
          unitB="in"
          activeUnit={form.waistUnit}
          placeholder={form.waistUnit === 'cm' ? '60 – 150' : '24 – 59'}
          onValueChange={v => patch('waistValue', v)}
          onUnitToggle={toggleWaistUnit}
        />

        {/* ── Contact ─────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 font-dm-sans">Contact</label>
          <div className="flex gap-2">
            {([
              { method: 'email' as ContactMethod, label: 'Email'  },
              { method: 'sms'   as ContactMethod, label: 'Mobile' },
            ]).map(({ method, label }) => (
              <button
                key={method}
                type="button"
                onClick={() => switchContactMethod(method)}
                className={[
                  'flex-1 py-2 rounded-btn text-xs font-medium font-dm-sans border transition-colors',
                  form.contactMethod === method ? tapActiveCls : tapInactiveCls,
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            key={form.contactMethod}
            type={form.contactMethod === 'email' ? 'email' : 'tel'}
            value={form.contactValue}
            onChange={e => patch('contactValue', e.target.value)}
            placeholder={form.contactMethod === 'email' ? 'patient@email.com' : '+966 5x xxx xxxx'}
            autoComplete="off"
            className={inputCls}
          />
        </div>

        {/* ── Preferred language ───────────────────────────────────────────── */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 font-dm-sans">
            Patient&apos;s preferred language
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => patch('language', 'en')}
              className={[
                'py-3 rounded-btn text-sm font-medium font-dm-sans border transition-colors',
                form.language === 'en' ? tapActiveCls : tapInactiveCls,
              ].join(' ')}
            >
              English
            </button>
            {/* Arabic — RTL scoped to this element only, never global */}
            <button
              type="button"
              onClick={() => patch('language', 'ar')}
              className={[
                'py-3 rounded-btn text-sm font-medium border transition-colors',
                form.language === 'ar' ? tapActiveCls : tapInactiveCls,
              ].join(' ')}
            >
              <span dir="rtl" lang="ar" className="font-tajawal">العربية</span>
            </button>
          </div>
        </div>

        {/* ── Inline error ─────────────────────────────────────────────────── */}
        {submitError && (
          <p className="text-sm text-red-600 font-dm-sans" role="alert">
            {submitError}
          </p>
        )}

        {/* ── Submit — appears only when all 8 fields are complete ─────────── */}
        {allFilled && (
          <button
            type="button"
            disabled={stage === 'submitting'}
            onClick={handleSubmit}
            className="w-full py-4 rounded-btn bg-brand-dark text-white font-medium text-base
                       font-dm-sans hover:opacity-90 active:opacity-95 transition-opacity
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {stage === 'submitting'
              ? 'Enrolling…'
              : isAr
                ? <span dir="rtl" lang="ar" className="font-tajawal">تسجيل المريض</span>
                : 'Enroll Patient'
            }
          </button>
        )}

      </div>
    </div>
  )
}
