'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter }                   from 'next/navigation'
import { createClient }                from '@supabase/supabase-js'
import { WeightChart }                 from '@/components/WeightChart'
import WaterCard                       from './WaterCard'

// ── Supabase browser client ───────────────────────────────────────────────────
function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Lang = 'en' | 'ar'

interface Patient {
  id:                 string
  first_name:         string
  preferred_language: Lang
  weight_kg:          number
  enrolled_at:        string
}

interface WeightLog  { weight_kg: number; logged_at: string }
interface ContextLog { context: string;   logged_at: string }

// Daily tip
interface DailyTip {
  tip_en: string
  tip_ar: string
}

// Feature 1 — Last meal
interface FoodLog {
  dish_name:              string | null
  tag:                    string | null
  note_en:                string | null
  calories_estimate_low:  number | null
  calories_estimate_high: number | null
  meal_type:              string | null
  logged_at:              string
}

type ContextOption = 'regular' | 'family_gathering' | 'ramadan' | 'travel' | 'stressed'

// ── Copy ──────────────────────────────────────────────────────────────────────
interface CopyShape {
  greeting:           (name: string) => string
  weightTitle:        string
  weightPlaceholder:  string
  weightSave:         string
  weightSaving:       string
  weightSaved:        string
  weightSkip:         string
  weightNoHistory:    string
  foodTitle:          string
  foodTap:            string
  foodAnalyzing:      string
  foodRetry:          string
  contextTitle:       string
  contextDone:        string
  ramadanBanner:      string
  options:            Record<ContextOption, string>
  tagLabels:          Record<string, string>
  errorLoad:          string
  errorSave:          string
}

const T: Record<Lang, CopyShape> = {
  en: {
    greeting:           (name: string) => `Good to see you, ${name}.`,
    weightTitle:        'Weekly weight',
    weightPlaceholder:  'Enter weight',
    weightSave:         'Save',
    weightSaving:       'Saving…',
    weightSaved:        'Saved',
    weightSkip:         'Skip for now — no pressure.',
    weightNoHistory:    'Your progress will appear here after your first entry.',
    foodTitle:          'What did you eat?',
    foodTap:            'Tap to add a photo',
    foodAnalyzing:      'Analyzing…',
    foodRetry:          'Try another photo',
    contextTitle:       "Today's feeling",
    contextDone:        'Logged for today.',
    ramadanBanner:      'Ramadan mode is on. Prompts will appear after Iftar and before Suhoor.',
    options: {
      regular:          'Regular day',
      family_gathering: 'Family gathering',
      ramadan:          'Ramadan',
      travel:           'Travel',
      stressed:         'Stressed',
    } as Record<ContextOption, string>,
    tagLabels:  { red: 'High calorie', yellow: 'Moderate', green: 'Balanced' },
    errorLoad:  'Could not load your data. Please refresh.',
    errorSave:  'Could not save. Please try again.',
  },
  ar: {
    greeting:           (name: string) => `مرحباً، ${name}.`,
    weightTitle:        'الوزن الأسبوعي',
    weightPlaceholder:  'أدخل الوزن',
    weightSave:         'حفظ',
    weightSaving:       'جارٍ الحفظ…',
    weightSaved:        'تم الحفظ',
    weightSkip:         'يمكنك تخطي هذا الآن.',
    weightNoHistory:    'سيظهر تقدمك هنا بعد أول تسجيل.',
    foodTitle:          'ماذا أكلت؟',
    foodTap:            'اضغط لإضافة صورة',
    foodAnalyzing:      'جارٍ التحليل…',
    foodRetry:          'جرّب صورة أخرى',
    contextTitle:       'كيف يومك؟',
    contextDone:        'تم التسجيل لهذا اليوم.',
    ramadanBanner:      'وضع رمضان مفعّل. ستظهر التذكيرات بعد الإفطار وقبل السحور.',
    options: {
      regular:          'يوم عادي',
      family_gathering: 'تجمع عائلي',
      ramadan:          'رمضان',
      travel:           'سفر',
      stressed:         'ضغط نفسي',
    } as Record<ContextOption, string>,
    tagLabels:  { red: 'سعرات عالية', yellow: 'معتدل', green: 'متوازن' },
    errorLoad:  'تعذّر تحميل بياناتك. يرجى تحديث الصفحة.',
    errorSave:  'تعذّر الحفظ. يرجى المحاولة مرة أخرى.',
  },
}

const CONTEXT_OPTIONS: ContextOption[] = [
  'regular', 'family_gathering', 'ramadan', 'travel', 'stressed',
]

const TAG_COLORS: Record<string, string> = {
  green:  'bg-emerald-50 text-emerald-800 border-emerald-200',
  yellow: 'bg-amber-50  text-amber-800  border-amber-200',
  red:    'bg-red-50    text-red-800    border-red-200',
}

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch',     label: 'Lunch'     },
  { value: 'dinner',    label: 'Dinner'    },
  { value: 'snack',     label: 'Snack'     },
] as const

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: '🌅 Breakfast',
  lunch:     '☀️ Lunch',
  dinner:    '🌙 Dinner',
  snack:     '🍎 Snack',
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function startOfWeek(): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfDay(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// "Mar 14"
function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// "Today" / "Yesterday" / "Mar 12"
function fmtMealDate(iso: string): string {
  const logDate   = new Date(iso)
  const today     = startOfDay()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (logDate >= today)     return 'Today'
  if (logDate >= yesterday) return 'Yesterday'
  return fmtShortDate(iso)
}

// Step 2B — client-side sanitizer for food name hint
function sanitizeFoodName(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')                                    // strip HTML tags
    .replace(/https?:\/\/\S+/gi, '')                            // strip URLs
    .replace(/[^a-zA-Z0-9\s\-''\u0600-\u06FF]/g, '')           // keep only allowed chars
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
}

// Feature 3 — streak: count consecutive days with ANY log, going back from today
function calcStreak(allLogDates: string[]): number {
  const dateSet = new Set(allLogDates.map(d => d.slice(0, 10)))   // "YYYY-MM-DD"
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (dateSet.has(key)) { streak++ } else { break }
  }
  return streak
}

// ── Layout helpers ────────────────────────────────────────────────────────────
function Shell({ children, isAr }: { children: React.ReactNode; isAr: boolean }) {
  return (
    <div
      dir={isAr ? 'rtl' : undefined}
      lang={isAr ? 'ar' : undefined}
      className="min-h-screen bg-canvas px-4 py-8"
    >
      <div className="w-full max-w-[480px] mx-auto space-y-4">
        {children}
      </div>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-card border border-gray-100 shadow-sm p-6 ${className}`}>
      {children}
    </div>
  )
}

// ── Daily Tip card ────────────────────────────────────────────────────────────
function TipCard({ tip, isAr }: { tip: DailyTip; isAr: boolean }) {
  return (
    <div
      style={{
        background:   '#0D5C45',
        borderRadius: 16,
        padding:      '20px 24px',
      }}
    >
      {/* Label */}
      <p
        className="font-dm-sans uppercase"
        style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em', marginBottom: 10 }}
      >
        {isAr ? 'نصيحة اليوم' : "Today's insight"}
      </p>

      {/* English tip */}
      <p
        className="font-dm-sans"
        style={{ fontSize: 14, color: '#ffffff', lineHeight: 1.55, margin: 0 }}
      >
        {tip.tip_en}
      </p>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', margin: '14px 0' }} />

      {/* Arabic tip */}
      <p
        className="font-tajawal"
        dir="rtl"
        style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.65, margin: 0, textAlign: 'right' }}
      >
        {tip.tip_ar}
      </p>
    </div>
  )
}

// ── Feature 1: Weight check-in (with history list) ────────────────────────────
function WeightSection({
  patient, weightLogs, isAr, onSaved,
}: {
  patient:    Patient
  weightLogs: WeightLog[]
  isAr:       boolean
  onSaved:    (log: WeightLog) => void
}) {
  const t = T[isAr ? 'ar' : 'en']
  const [unit,   setUnit]   = useState<'kg' | 'lbs'>('kg')
  const [value,  setValue]  = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const chartPoints = [...weightLogs].reverse()

  const handleSave = async () => {
    const n = parseFloat(value)
    if (!n || n <= 0) return
    const kg = unit === 'lbs' ? Math.round((n / 2.20462) * 10) / 10 : n
    setStatus('saving')
    const { error } = await supabase().from('weight_logs').insert({
      patient_id: patient.id,
      weight_kg:  kg,
    })
    if (error) { setStatus('error'); return }
    setStatus('saved')
    setValue('')
    onSaved({ weight_kg: kg, logged_at: new Date().toISOString() })
    setTimeout(() => setStatus('idle'), 2000)
  }

  return (
    <Card>
      <h2 className={`text-base font-semibold text-gray-900 mb-4 ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
        {t.weightTitle}
      </h2>

      {/* Chart */}
      <div className="mb-4">
        {chartPoints.length > 0
          ? <WeightChart
              points={chartPoints}
              baseline={{ weight_kg: patient.weight_kg, enrolled_at: patient.enrolled_at }}
              unit={unit}
            />
          : <p className={`text-sm text-gray-400 ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
              {t.weightNoHistory}
            </p>
        }
      </div>

      {/* Feature 2 — Weight history: last 3 rows, only if 2+ logs exist */}
      {weightLogs.length >= 2 && (
        <div className="mb-4 pt-1 border-t border-gray-100">
          {weightLogs.slice(0, 3).map((log, i) => {
            const prev  = weightLogs[i + 1]
            const delta = prev != null ? log.weight_kg - prev.weight_kg : null
            const deltaColor =
              delta == null || delta === 0 ? '#999'
              : delta > 0 ? '#B94040'
              : '#1D9E75'
            const deltaLabel =
              delta == null  ? '—'
              : delta === 0  ? '—'
              : delta > 0    ? `↑ ${delta.toFixed(1)} kg`
              :                `↓ ${Math.abs(delta).toFixed(1)} kg`
            return (
              <div key={i}>
                {i > 0 && <div style={{ height: 1, background: '#f0f0f0' }} />}
                <div className="flex items-center justify-between" style={{ padding: '10px 0' }}>
                  <span className="font-dm-sans text-[13px]" style={{ color: '#666' }}>
                    {fmtShortDate(log.logged_at)}
                  </span>
                  <span className="font-dm-sans text-[13px] font-medium" style={{ color: '#1a1a1a' }}>
                    {log.weight_kg} kg
                  </span>
                  <span className="font-dm-sans text-[13px]"
                        style={{ color: deltaColor, minWidth: 72, textAlign: 'right' }}>
                    {deltaLabel}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Input row */}
      <div className={`flex gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
        <input
          type="number"
          inputMode="decimal"
          placeholder={t.weightPlaceholder}
          value={value}
          onChange={e => setValue(e.target.value)}
          className={`flex-1 px-4 py-3 border border-gray-200 rounded-btn text-gray-900 text-base
                      focus:outline-none focus:ring-2 focus:ring-brand-mid
                      ${isAr ? 'font-tajawal text-right' : 'font-dm-sans'}`}
        />
        <div className="flex rounded-btn border border-gray-200 overflow-hidden text-sm font-dm-sans">
          {(['kg', 'lbs'] as const).map(u => (
            <button key={u} type="button" onClick={() => setUnit(u)}
              className={`px-3 py-3 transition-colors ${
                unit === u ? 'bg-brand-dark text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}>
              {u}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!value || status === 'saving'}
          onClick={handleSave}
          className={`px-4 py-3 rounded-btn text-sm font-semibold transition-colors
                      ${isAr ? 'font-tajawal' : 'font-dm-sans'}
                      ${!value || status === 'saving'
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-brand-dark text-white hover:opacity-90 cursor-pointer'}`}>
          {status === 'saving' ? t.weightSaving : status === 'saved' ? t.weightSaved : t.weightSave}
        </button>
      </div>

      {status === 'error' && (
        <p className={`text-sm text-red-700 mt-2 ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>{t.errorSave}</p>
      )}
      <p className={`text-xs text-gray-400 mt-3 ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>{t.weightSkip}</p>
    </Card>
  )
}

// ── Feature 2: Daily food photo ───────────────────────────────────────────────
function FoodSection({ patient, isAr }: { patient: Patient; isAr: boolean }) {
  const t       = T[isAr ? 'ar' : 'en']
  const fileRef = useRef<HTMLInputElement>(null)

  type FoodState = 'idle' | 'analyzing' | 'done' | 'error'
  const [state,         setState]        = useState<FoodState>('idle')
  const [result,        setResult]       = useState<{
    dish_name:              string
    tag:                    string
    note_en:                string
    note_ar:                string
    calories_estimate_low?: number
    calories_estimate_high?: number
  } | null>(null)
  const [preview,       setPreview]      = useState<string | null>(null)
  // Step 2A — meal type selector
  const [mealType,      setMealType]     = useState<string | null>(null)
  // Step 2B — optional food name hint
  const [foodNameHint,  setFoodNameHint] = useState('')

  const handleReset = () => {
    setState('idle')
    setPreview(null)
    setResult(null)
    setMealType(null)
    setFoodNameHint('')
  }

  // Step 3 — include mealType and foodNameHint in FormData
  const handleFile = async (file: File) => {
    setPreview(URL.createObjectURL(file))
    setState('analyzing')
    setResult(null)
    const fd = new FormData()
    fd.append('image',     file)
    fd.append('patientId', patient.id)
    if (mealType)                      fd.append('mealType',     mealType)
    if (foodNameHint.trim().length > 0) fd.append('foodNameHint', sanitizeFoodName(foodNameHint))
    try {
      const res  = await fetch('/api/food-log', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || !json.success) { setState('error'); return }
      setResult(json.data)
      setState('done')
    } catch {
      setState('error')
    }
  }

  const sanitizedLen = sanitizeFoodName(foodNameHint).length

  return (
    <Card>
      <h2 className={`text-base font-semibold text-gray-900 mb-4 ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
        {t.foodTitle}
      </h2>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />

      {state === 'idle' && (
        <>
          {/* Step 2A — Meal type selector */}
          <div className={`flex gap-2 flex-wrap mb-3 ${isAr ? 'flex-row-reverse' : ''}`}>
            {MEAL_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMealType(prev => prev === value ? null : value)}
                className="font-dm-sans transition-colors"
                style={{
                  fontSize:     13,
                  padding:      '6px 16px',
                  borderRadius: 20,
                  border:       `1px solid ${mealType === value ? '#0D5C45' : '#e0e0e0'}`,
                  background:   mealType === value ? '#0D5C45' : '#fff',
                  color:        mealType === value ? '#fff'    : '#666',
                  cursor:       'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Step 2B — Optional food name hint */}
          <div className="mb-3">
            <input
              type="text"
              maxLength={120}
              value={foodNameHint}
              onChange={e => setFoodNameHint(sanitizeFoodName(e.target.value))}
              placeholder="What did you eat? (optional)"
              className="w-full font-dm-sans"
              style={{
                height:       44,
                border:       '1px solid #e0e0e0',
                borderRadius: 12,
                padding:      '0 14px',
                fontSize:     14,
                color:        '#1a1a1a',
                outline:      'none',
                boxSizing:    'border-box',
              }}
              onFocus={e  => { e.currentTarget.style.borderColor = '#0D5C45' }}
              onBlur={e   => { e.currentTarget.style.borderColor = '#e0e0e0' }}
            />
            {foodNameHint.length > 0 && (
              <p className="font-dm-sans text-right mt-1"
                 style={{ fontSize: 11, color: '#bbb' }}>
                {sanitizedLen}/100
              </p>
            )}
          </div>

          {/* Photo upload button */}
          <button type="button" onClick={() => fileRef.current?.click()}
            className={`w-full py-10 border-2 border-dashed border-gray-200 rounded-card
                        text-gray-400 text-sm transition-colors hover:border-brand-mid hover:text-brand-mid
                        cursor-pointer ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
            {t.foodTap}
          </button>
        </>
      )}

      {state === 'analyzing' && (
        <div className="flex flex-col items-center gap-3 py-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && <img src={preview} alt="" className="w-24 h-24 object-cover rounded-card opacity-60" />}
          <p className={`text-sm text-gray-400 ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>{t.foodAnalyzing}</p>
        </div>
      )}

      {state === 'done' && result && (
        <div className="space-y-3">
          <div className="flex gap-3 items-start">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={result.dish_name}
                   className="w-16 h-16 object-cover rounded-btn flex-shrink-0" />
            )}
            <div className="space-y-1 flex-1">
              <p className={`font-semibold text-gray-900 text-sm ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
                {result.dish_name}
              </p>
              <span className={`inline-block text-xs px-2.5 py-1 rounded-full border font-medium
                               ${isAr ? 'font-tajawal' : 'font-dm-sans'} ${TAG_COLORS[result.tag] ?? TAG_COLORS.yellow}`}>
                {t.tagLabels[result.tag as keyof typeof t.tagLabels] ?? result.tag}
              </span>
              <p className={`text-xs text-gray-500 leading-relaxed ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
                {isAr ? result.note_ar : result.note_en}
              </p>
              {result.calories_estimate_low != null && result.calories_estimate_high != null && (
                <p className="mt-1.5 text-[13px] leading-snug" style={{ color: '#0D5C45' }}>
                  <span className="font-dm-sans">~{result.calories_estimate_low}–{result.calories_estimate_high} kcal · </span>
                  <span className="font-tajawal">سعرة حرارية تقريبية</span>
                </p>
              )}
            </div>
          </div>
          <button type="button"
            onClick={handleReset}
            className={`text-xs text-brand-mid underline cursor-pointer bg-transparent border-none p-0
                        ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
            {t.foodRetry}
          </button>
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-3">
          <p className={`text-sm text-red-700 ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>{t.errorSave}</p>
          <button type="button" onClick={handleReset}
            className={`text-xs text-brand-mid underline cursor-pointer bg-transparent border-none p-0
                        ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
            {t.foodRetry}
          </button>
        </div>
      )}
    </Card>
  )
}

// ── Feature 1 (new): Last meal card ──────────────────────────────────────────
function LastMealSection({ lastMeal, isAr }: { lastMeal: FoodLog; isAr: boolean }) {
  const t = T[isAr ? 'ar' : 'en']
  return (
    <div
      className="bg-white rounded-card border border-gray-100 shadow-sm"
      style={{ padding: '20px 24px' }}
    >
      <p
        className="font-dm-sans uppercase"
        style={{ fontSize: 11, color: '#888', letterSpacing: '0.08em' }}
      >
        Last Meal
      </p>

      {/* Step 5 — meal type pill */}
      {lastMeal.meal_type && MEAL_TYPE_LABELS[lastMeal.meal_type] && (
        <p className="font-dm-sans mt-1" style={{ fontSize: 11, color: '#888' }}>
          {MEAL_TYPE_LABELS[lastMeal.meal_type]}
        </p>
      )}

      <p className="font-dm-sans font-medium mt-1" style={{ fontSize: 16, color: '#1a1a1a' }}>
        {lastMeal.dish_name ?? '—'}
      </p>

      {lastMeal.calories_estimate_low != null && lastMeal.calories_estimate_high != null && (
        <p className="font-dm-sans mt-0.5" style={{ fontSize: 13, color: '#1D9E75' }}>
          ~{lastMeal.calories_estimate_low}–{lastMeal.calories_estimate_high} kcal
        </p>
      )}

      {lastMeal.tag && (
        <span
          className={`inline-block text-xs px-2.5 py-1 rounded-full border font-medium font-dm-sans mt-1.5
                      ${TAG_COLORS[lastMeal.tag] ?? TAG_COLORS.yellow}`}
        >
          {t.tagLabels[lastMeal.tag as keyof typeof t.tagLabels] ?? lastMeal.tag}
        </span>
      )}

      {lastMeal.note_en && (
        <p className="font-dm-sans mt-1.5" style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
          {lastMeal.note_en}
        </p>
      )}

      <p className="font-dm-sans mt-1" style={{ fontSize: 11, color: '#bbb' }}>
        {fmtMealDate(lastMeal.logged_at)}
      </p>
    </div>
  )
}

// ── Feature 3: Context tap ────────────────────────────────────────────────────
function ContextSection({
  patient, todayContext, isRamadanMode, isAr, onLogged,
}: {
  patient:       Patient
  todayContext:  string | null
  isRamadanMode: boolean
  isAr:          boolean
  onLogged:      (ctx: ContextOption) => void
}) {
  const t = T[isAr ? 'ar' : 'en']
  const [saving, setSaving] = useState<ContextOption | null>(null)
  const [saved,  setSaved]  = useState<ContextOption | null>(todayContext as ContextOption | null)
  const [error,  setError]  = useState(false)

  const handleTap = async (ctx: ContextOption) => {
    if (saved) return
    setSaving(ctx)
    setError(false)
    const { error: e } = await supabase().from('context_logs').insert({
      patient_id: patient.id,
      context:    ctx,
    })
    if (e) { setError(true); setSaving(null); return }
    setSaved(ctx)
    setSaving(null)
    onLogged(ctx)
  }

  return (
    <Card>
      <h2 className={`text-base font-semibold text-gray-900 mb-4 ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
        {t.contextTitle}
      </h2>

      {saved ? (
        <p className={`text-sm text-brand-dark font-medium ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
          {t.contextDone}&nbsp;
          <span className="text-gray-600 font-normal">{t.options[saved]}</span>
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {CONTEXT_OPTIONS.map(opt => (
            <button key={opt} type="button" disabled={!!saving} onClick={() => handleTap(opt)}
              className={`px-4 py-2.5 rounded-btn text-sm border transition-colors cursor-pointer
                          ${isAr ? 'font-tajawal' : 'font-dm-sans'}
                          ${saving === opt
                            ? 'bg-brand-dark text-white border-brand-dark'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-brand-mid hover:text-brand-dark'
                          }`}>
              {t.options[opt]}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className={`text-sm text-red-700 mt-2 ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>{t.errorSave}</p>
      )}

      {isRamadanMode && (
        <div className={`mt-4 bg-brand-light rounded-btn px-4 py-3 text-sm text-brand-dark
                         ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
          {t.ramadanBanner}
        </div>
      )}
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PatientHomePage() {
  const router = useRouter()

  const [patient,      setPatient]      = useState<Patient | null>(null)
  const [weightLogs,   setWeightLogs]   = useState<WeightLog[]>([])
  const [contextLogs,  setContextLogs]  = useState<ContextLog[]>([])
  const [todayContext, setTodayContext] = useState<string | null>(null)
  const [lastMeal,     setLastMeal]     = useState<FoodLog | null>(null)   // Feature 1
  const [streak,       setStreak]       = useState(0)                       // Feature 3
  const [dailyTip,     setDailyTip]     = useState<DailyTip | null>(null)  // Daily tip
  const [loading,      setLoading]      = useState(true)

  const isAr          = patient?.preferred_language === 'ar'
  const t             = T[isAr ? 'ar' : 'en']
  const isRamadanMode = contextLogs.filter(l => l.context === 'ramadan').length >= 3

  useEffect(() => {
    const load = async () => {
      const db = supabase()

      const { data: { user }, error: authErr } = await db.auth.getUser()
      if (authErr || !user) { router.replace('/patient/login'); return }

      const { data: pat, error: patErr } = await db
        .from('patients')
        .select('id, first_name, preferred_language, weight_kg, enrolled_at')
        .eq('user_id', user.id)
        .single()
      if (patErr || !pat) { router.replace('/patient/login'); return }
      setPatient(pat as Patient)

      // Existing queries
      const { data: wLogs } = await db
        .from('weight_logs')
        .select('weight_kg, logged_at')
        .eq('patient_id', pat.id)
        .order('logged_at', { ascending: false })
        .limit(8)
      setWeightLogs(wLogs ?? [])

      const { data: cLogs } = await db
        .from('context_logs')
        .select('context, logged_at')
        .eq('patient_id', pat.id)
        .gte('logged_at', startOfWeek().toISOString())
        .order('logged_at', { ascending: false })
      setContextLogs(cLogs ?? [])

      const todayLog = (cLogs ?? []).find(l => new Date(l.logged_at) >= startOfDay())
      setTodayContext(todayLog?.context ?? null)

      // New parallel queries: last meal + streak date data
      const streakStart = new Date()
      streakStart.setDate(streakStart.getDate() - 30)
      streakStart.setHours(0, 0, 0, 0)
      const streakISO = streakStart.toISOString()

      const [
        { data: lastMealData },
        { data: wDates },
        { data: fDates },
        { data: cDates },
      ] = await Promise.all([
        db.from('food_logs')
          .select('dish_name, tag, note_en, calories_estimate_low, calories_estimate_high, meal_type, logged_at')
          .eq('patient_id', pat.id)
          .order('logged_at', { ascending: false })
          .limit(1),
        db.from('weight_logs')
          .select('logged_at')
          .eq('patient_id', pat.id)
          .gte('logged_at', streakISO),
        db.from('food_logs')
          .select('logged_at')
          .eq('patient_id', pat.id)
          .gte('logged_at', streakISO),
        db.from('context_logs')
          .select('logged_at')
          .eq('patient_id', pat.id)
          .gte('logged_at', streakISO),
      ])

      if (lastMealData?.[0]) setLastMeal(lastMealData[0] as FoodLog)

      const allDates = [
        ...(wDates ?? []),
        ...(fDates ?? []),
        ...(cDates ?? []),
      ].map(l => l.logged_at)
      setStreak(calcStreak(allDates))

      // Fetch daily tip (fire-and-forget — page renders without blocking)
      const today = new Date().toISOString().slice(0, 10)
      fetch(`/api/daily-tip?patientId=${pat.id}&date=${today}`)
        .then(r => r.json())
        .then(json => { if (json.success) setDailyTip(json.data) })
        .catch(() => { /* fail silently — tip is non-critical */ })

      setLoading(false)
    }
    load()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Shell isAr={false}>
        <p className="text-center font-dm-sans text-sm text-gray-400 pt-20">Loading…</p>
      </Shell>
    )
  }

  if (!patient) return null

  return (
    <Shell isAr={isAr}>

      {/* Greeting + Feature 3: streak indicator */}
      <div className="px-1">
        <p className={`text-xl text-gray-900 ${isAr ? 'font-tajawal' : 'font-playfair'}`}>
          {t.greeting(patient.first_name)}
        </p>
        {streak >= 1 && (
          <p
            className="font-dm-sans mt-1"
            style={{ fontSize: 13, color: streak >= 2 ? '#0D5C45' : '#666' }}
          >
            {streak >= 2
              ? `🔥 ${streak} day streak`
              : 'Good start — come back tomorrow'}
          </p>
        )}
      </div>

      {/* Daily Tip — first card, only shown once tip loads */}
      {dailyTip && <TipCard tip={dailyTip} isAr={isAr} />}

      <WeightSection
        patient={patient}
        weightLogs={weightLogs}
        isAr={isAr}
        onSaved={log => setWeightLogs(prev => [log, ...prev].slice(0, 8))}
      />

      {/* Water Tracker — after weight, before food */}
      <WaterCard patientId={patient.id} isAr={isAr} />

      <FoodSection patient={patient} isAr={isAr} />

      {/* Feature 1: last meal card — only shown if a food log exists */}
      {lastMeal && <LastMealSection lastMeal={lastMeal} isAr={isAr} />}

      <ContextSection
        patient={patient}
        todayContext={todayContext}
        isRamadanMode={isRamadanMode}
        isAr={isAr}
        onLogged={ctx => {
          const now = new Date().toISOString()
          setContextLogs(prev => [{ context: ctx, logged_at: now }, ...prev])
          setTodayContext(ctx)
        }}
      />

    </Shell>
  )
}
