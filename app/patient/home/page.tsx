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
  protein_g:              number | null
  carbs_g:                number | null
  fat_g:                  number | null
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

// ── Macro Pills ───────────────────────────────────────────────────────────────
function MacroPills({
  protein_g, carbs_g, fat_g,
}: {
  protein_g?: number | null
  carbs_g?:   number | null
  fat_g?:     number | null
}) {
  if (protein_g == null || carbs_g == null || fat_g == null) return null
  const pills = [
    { emoji: '🥩', label: `${protein_g}g protein` },
    { emoji: '🌾', label: `${carbs_g}g carbs`   },
    { emoji: '🫒', label: `${fat_g}g fat`        },
  ]
  return (
    <div className="flex gap-2 flex-wrap mt-1.5">
      {pills.map(({ emoji, label }) => (
        <span
          key={label}
          className="font-dm-sans"
          style={{
            background:   '#F5F5F5',
            borderRadius: 8,
            padding:      '4px 10px',
            fontSize:     12,
            color:        '#666',
          }}
        >
          {emoji} {label}
        </span>
      ))}
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

// ── Feature 2: Daily food photo (confirm/retake flow) ─────────────────────────
function FoodSection({
  patient, isAr, onConfirmed,
}: {
  patient:     Patient
  isAr:        boolean
  onConfirmed: (meal: FoodLog, calLow: number, calHigh: number) => void
}) {
  const t       = T[isAr ? 'ar' : 'en']
  const fileRef = useRef<HTMLInputElement>(null)

  type FoodState = 'idle' | 'analyzing' | 'pending' | 'confirming' | 'done' | 'error'
  const [state,         setState]        = useState<FoodState>('idle')
  const [pendingResult, setPendingResult] = useState<{
    dish_name:              string
    tag:                    string
    note_en:                string
    note_ar:                string
    calories_estimate_low?:  number
    calories_estimate_high?: number
    protein_g?:              number
    carbs_g?:                number
    fat_g?:                  number
  } | null>(null)
  const [preview,      setPreview]     = useState<string | null>(null)
  const [mealType,     setMealType]    = useState<string | null>(null)
  const [foodNameHint, setFoodNameHint] = useState('')
  const [celebrating,  setCelebrating] = useState(false)

  const handleReset = () => {
    setState('idle')
    setPreview(null)
    setPendingResult(null)
    setMealType(null)
    setFoodNameHint('')
  }

  const handleFile = async (file: File) => {
    setPreview(URL.createObjectURL(file))
    setState('analyzing')
    setPendingResult(null)
    const fd = new FormData()
    fd.append('image',     file)
    fd.append('patientId', patient.id)
    if (mealType)                       fd.append('mealType',     mealType)
    if (foodNameHint.trim().length > 0) fd.append('foodNameHint', sanitizeFoodName(foodNameHint))
    try {
      const res  = await fetch('/api/food-log/analyze', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || !json.success) { setState('error'); return }
      setPendingResult(json.data)
      setState('pending')
    } catch {
      setState('error')
    }
  }

  const handleConfirm = async () => {
    if (!pendingResult) return
    setState('confirming')
    try {
      const res  = await fetch('/api/food-log/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ patientId: patient.id, analysis: pendingResult, mealType }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) { setState('error'); return }

      const confirmedMeal: FoodLog = {
        dish_name:              pendingResult.dish_name,
        tag:                    pendingResult.tag,
        note_en:                pendingResult.note_en,
        calories_estimate_low:  pendingResult.calories_estimate_low  ?? null,
        calories_estimate_high: pendingResult.calories_estimate_high ?? null,
        protein_g:              pendingResult.protein_g ?? null,
        carbs_g:                pendingResult.carbs_g   ?? null,
        fat_g:                  pendingResult.fat_g     ?? null,
        meal_type:              mealType ?? null,
        logged_at:              new Date().toISOString(),
      }
      onConfirmed(
        confirmedMeal,
        pendingResult.calories_estimate_low  ?? 0,
        pendingResult.calories_estimate_high ?? 0,
      )
      setCelebrating(true)
      setState('done')
      setTimeout(() => {
        setCelebrating(false)
        handleReset()
      }, 2200)
    } catch {
      setState('error')
    }
  }

  const sanitizedLen = sanitizeFoodName(foodNameHint).length

  return (
    <>
      {/* ── Celebration overlay ── */}
      {celebrating && pendingResult && (
        <>
          <style>{`
            @keyframes mizanCelebrate {
              0%  { opacity: 0; transform: scale(0.96); }
              12% { opacity: 1; transform: scale(1);    }
              80% { opacity: 1; transform: scale(1);    }
              100%{ opacity: 0; transform: scale(1.02); }
            }
            .mizan-celebrate { animation: mizanCelebrate 2.2s ease-in-out forwards; }
          `}</style>
          <div
            className="mizan-celebrate"
            style={{
              position:       'fixed',
              inset:          0,
              zIndex:         1000,
              background:     'rgba(255,255,255,0.93)',
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 64 }}>✨</span>
            <p className="font-playfair"
               style={{ fontSize: 24, color: '#0D5C45', marginTop: 16, textAlign: 'center' }}>
              Meal logged!
            </p>
            <p className="font-dm-sans"
               style={{ fontSize: 16, color: '#666', marginTop: 8, textAlign: 'center' }}>
              {pendingResult.dish_name}
            </p>
          </div>
        </>
      )}

      <Card>
        <h2 className={`text-base font-semibold text-gray-900 mb-4 ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
          {t.foodTitle}
        </h2>

        {/* Hidden file input — no capture= so iOS/Android shows full choice sheet */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />

        {/* ── IDLE ── */}
        {state === 'idle' && (
          <>
            {/* Meal type selector */}
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

            {/* Food name hint */}
            <div className="mb-4">
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
                onFocus={e => { e.currentTarget.style.borderColor = '#0D5C45' }}
                onBlur={e  => { e.currentTarget.style.borderColor = '#e0e0e0' }}
              />
              {foodNameHint.length > 0 && (
                <p className="font-dm-sans text-right mt-1" style={{ fontSize: 11, color: '#bbb' }}>
                  {sanitizedLen}/100
                </p>
              )}
            </div>

            {/* 📸 Log a Meal button */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`w-full font-dm-sans font-bold flex items-center justify-center gap-2
                          transition-opacity hover:opacity-90 cursor-pointer
                          ${isAr ? 'flex-row-reverse' : ''}`}
              style={{
                height:       56,
                background:   '#1A1A1A',
                color:        '#fff',
                fontSize:     18,
                borderRadius: 16,
                border:       'none',
              }}
            >
              <span>📸</span>
              <span>{isAr ? 'سجّل وجبة' : 'Log a Meal'}</span>
            </button>
          </>
        )}

        {/* ── ANALYZING — full-width photo + spinner overlay ── */}
        {state === 'analyzing' && (
          <div className="relative">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt=""
                className="w-full object-cover"
                style={{ borderRadius: 16, maxHeight: 240, display: 'block' }}
              />
            )}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2"
              style={{ background: 'rgba(255,255,255,0.72)', borderRadius: 16 }}
            >
              <div style={{
                width:          28,
                height:         28,
                border:         '3px solid #E8F5F0',
                borderTopColor: '#1D9E75',
                borderRadius:   '50%',
                animation:      'spin 0.9s linear infinite',
              }} />
              <p className="font-dm-sans" style={{ fontSize: 13, color: '#666' }}>
                {t.foodAnalyzing}
              </p>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── PENDING / CONFIRMING — dashed card with confirm + retake ── */}
        {(state === 'pending' || state === 'confirming') && pendingResult && (
          <div style={{ border: '1.5px dashed #DDD', borderRadius: 12, padding: '16px 16px 14px' }}>
            {/* "Does this look right?" banner */}
            <p className="font-dm-sans"
               style={{ fontSize: 12, color: '#999', fontStyle: 'italic', marginBottom: 12 }}>
              Does this look right?
            </p>

            {/* Thumbnail + result info */}
            <div className="flex gap-3 items-start mb-4">
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt={pendingResult.dish_name}
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
                />
              )}
              <div className="space-y-1 flex-1 min-w-0">
                <p className={`font-semibold text-gray-900 text-sm ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
                  {pendingResult.dish_name}
                </p>
                <span className={`inline-block text-xs px-2.5 py-1 rounded-full border font-medium
                                 ${isAr ? 'font-tajawal' : 'font-dm-sans'}
                                 ${TAG_COLORS[pendingResult.tag] ?? TAG_COLORS.yellow}`}>
                  {t.tagLabels[pendingResult.tag as keyof typeof t.tagLabels] ?? pendingResult.tag}
                </span>
                <p className={`text-xs text-gray-500 leading-relaxed ${isAr ? 'font-tajawal' : 'font-dm-sans'}`}>
                  {isAr ? pendingResult.note_ar : pendingResult.note_en}
                </p>
                {pendingResult.calories_estimate_low != null && pendingResult.calories_estimate_high != null && (
                  <p className="mt-1 text-[13px] leading-snug" style={{ color: '#0D5C45' }}>
                    <span className="font-dm-sans">
                      ~{pendingResult.calories_estimate_low}–{pendingResult.calories_estimate_high} kcal ·{' '}
                    </span>
                    <span className="font-tajawal">سعرة حرارية تقريبية</span>
                  </p>
                )}
                <MacroPills
                  protein_g={pendingResult.protein_g}
                  carbs_g={pendingResult.carbs_g}
                  fat_g={pendingResult.fat_g}
                />
              </div>
            </div>

            {/* Confirm button */}
            <button
              type="button"
              disabled={state === 'confirming'}
              onClick={handleConfirm}
              className="w-full font-dm-sans font-semibold transition-opacity"
              style={{
                height:       48,
                background:   state === 'confirming' ? '#1D9E75' : '#0D5C45',
                color:        '#fff',
                fontSize:     15,
                borderRadius: 12,
                border:       'none',
                cursor:       state === 'confirming' ? 'not-allowed' : 'pointer',
                marginBottom: 10,
                opacity:      state === 'confirming' ? 0.8 : 1,
              }}
            >
              {state === 'confirming' ? 'Saving…' : "✓ Yes, that's right"}
            </button>

            {/* Retake button */}
            <button
              type="button"
              disabled={state === 'confirming'}
              onClick={handleReset}
              className="w-full font-dm-sans transition-opacity"
              style={{
                height:       48,
                background:   '#F5F5F5',
                color:        '#666',
                fontSize:     15,
                borderRadius: 12,
                border:       'none',
                cursor:       state === 'confirming' ? 'not-allowed' : 'pointer',
              }}
            >
              ↩ Retake photo
            </button>
          </div>
        )}

        {/* ── DONE — brief logged state while celebration plays ── */}
        {state === 'done' && (
          <div className="flex items-center justify-center py-6">
            <p className="font-dm-sans" style={{ fontSize: 14, color: '#1D9E75' }}>
              ✓ Logged!
            </p>
          </div>
        )}

        {/* ── ERROR ── */}
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
    </>
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
      <MacroPills protein_g={lastMeal.protein_g} carbs_g={lastMeal.carbs_g} fat_g={lastMeal.fat_g} />

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

// ── Daily Calorie Ring ────────────────────────────────────────────────────────
const CALORIE_GOAL = 1800
const RING_R       = 19
const RING_CIRC    = 2 * Math.PI * RING_R

function CalorieRingCard({
  low, mealCount, proteinG, carbsG, fatG,
}: {
  low:       number
  mealCount: number
  proteinG:  number
  carbsG:    number
  fatG:      number
}) {
  // Use calories_estimate_low as the "consumed" figure (conservative estimate)
  const consumed    = low
  const pct         = Math.min(100, Math.round((consumed / CALORIE_GOAL) * 100))
  const isOverGoal  = consumed > CALORIE_GOAL
  const diff        = Math.abs(consumed - CALORIE_GOAL)
  const offset      = RING_CIRC * (1 - pct / 100)
  const ringColor   = isOverGoal ? '#C0392B' : '#1D9E75'
  const calColor    = isOverGoal ? '#C0392B' : '#0D5C45'

  const MACROS = [
    { emoji: '🥩', label: 'Protein', value: proteinG },
    { emoji: '🌾', label: 'Carbs',   value: carbsG   },
    { emoji: '🫒', label: 'Fat',     value: fatG     },
  ]

  return (
    <div
      style={{
        background:   '#fff',
        borderRadius: 16,
        padding:      20,
        boxShadow:    '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      <p
        className="font-dm-sans uppercase"
        style={{ fontSize: 12, color: '#999', letterSpacing: '0.08em', marginBottom: 12 }}
      >
        {"Today's Calories"}
      </p>

      {mealCount === 0 ? (
        <p className="font-dm-sans" style={{ fontSize: 14, color: '#BBB' }}>
          No meals logged yet
        </p>
      ) : (
        <>
          {/* Calories row */}
          <div className="flex items-center gap-4" style={{ marginBottom: 16 }}>
            <svg width={48} height={48} viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <circle
                cx={24} cy={24} r={RING_R}
                fill="none" stroke="#E8F5F0" strokeWidth={5}
              />
              <circle
                cx={24} cy={24} r={RING_R}
                fill="none"
                stroke={ringColor}
                strokeWidth={5}
                strokeDasharray={RING_CIRC}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 24 24)"
              />
              <text
                x={24} y={24}
                textAnchor="middle"
                dominantBaseline="central"
                style={{ fontSize: 9, fill: calColor, fontWeight: 600 }}
              >
                {pct}%
              </text>
            </svg>

            <div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span
                  className="font-dm-sans font-bold"
                  style={{ fontSize: 22, color: calColor, lineHeight: 1.1 }}
                >
                  {consumed.toLocaleString()}
                </span>
                <span
                  className="font-dm-sans"
                  style={{ fontSize: 14, color: '#BBB' }}
                >
                  / {CALORIE_GOAL.toLocaleString()} kcal
                </span>
              </div>
              <p
                className="font-dm-sans"
                style={{ fontSize: 11, color: isOverGoal ? '#C0392B' : '#666', marginTop: 3 }}
              >
                {isOverGoal ? `+${diff} over goal` : `${diff} remaining`}
              </p>
              <p
                className="font-dm-sans"
                style={{ fontSize: 12, color: '#999', marginTop: 2 }}
              >
                from {mealCount} meal photo{mealCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Daily macro totals */}
          <div
            className="flex"
            style={{ borderTop: '1px solid #F0F0F0', paddingTop: 12 }}
          >
            {MACROS.map(({ emoji, label, value }, i) => (
              <div
                key={label}
                className="flex-1 flex flex-col items-center"
                style={i > 0 ? { borderLeft: '1px solid #F0F0F0' } : undefined}
              >
                <p
                  className="font-dm-sans uppercase"
                  style={{ fontSize: 11, color: '#999' }}
                >
                  {emoji} {label}
                </p>
                <p
                  className="font-dm-sans font-bold"
                  style={{ fontSize: 16, color: '#1A1A1A', marginTop: 2 }}
                >
                  {value}g
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
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
  const [todayCalories, setTodayCalories] = useState<{
    low:      number
    high:     number
    mealCount: number
    proteinG: number
    carbsG:   number
    fatG:     number
  } | null>(null)
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
        { data: todayFoodData },
      ] = await Promise.all([
        db.from('food_logs')
          .select('dish_name, tag, note_en, calories_estimate_low, calories_estimate_high, protein_g, carbs_g, fat_g, meal_type, logged_at')
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
        db.from('food_logs')
          .select('calories_estimate_low, calories_estimate_high, protein_g, carbs_g, fat_g')
          .eq('patient_id', pat.id)
          .gte('logged_at', startOfDay().toISOString()),
      ])

      if (lastMealData?.[0]) setLastMeal(lastMealData[0] as FoodLog)

      const allDates = [
        ...(wDates ?? []),
        ...(fDates ?? []),
        ...(cDates ?? []),
      ].map(l => l.logged_at)
      setStreak(calcStreak(allDates))

      if (todayFoodData && todayFoodData.length > 0) {
        const low      = todayFoodData.reduce((sum, r) => sum + (r.calories_estimate_low  ?? 0), 0)
        const high     = todayFoodData.reduce((sum, r) => sum + (r.calories_estimate_high ?? 0), 0)
        const proteinG = todayFoodData.reduce((sum, r) => sum + (r.protein_g ?? 0), 0)
        const carbsG   = todayFoodData.reduce((sum, r) => sum + (r.carbs_g   ?? 0), 0)
        const fatG     = todayFoodData.reduce((sum, r) => sum + (r.fat_g     ?? 0), 0)
        setTodayCalories({ low, high, mealCount: todayFoodData.length, proteinG, carbsG, fatG })
      }

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
      <WaterCard patientId={patient.id} />

      {/* Daily Calorie Running Total */}
      <CalorieRingCard
        low={todayCalories?.low       ?? 0}
        mealCount={todayCalories?.mealCount ?? 0}
        proteinG={todayCalories?.proteinG   ?? 0}
        carbsG={todayCalories?.carbsG       ?? 0}
        fatG={todayCalories?.fatG           ?? 0}
      />

      <FoodSection
        patient={patient}
        isAr={isAr}
        onConfirmed={(meal, calLow, calHigh) => {
          setLastMeal(meal)
          setTodayCalories(prev => ({
            low:       (prev?.low      ?? 0) + calLow,
            high:      (prev?.high     ?? 0) + calHigh,
            mealCount: (prev?.mealCount ?? 0) + 1,
            proteinG:  (prev?.proteinG  ?? 0) + (meal.protein_g ?? 0),
            carbsG:    (prev?.carbsG    ?? 0) + (meal.carbs_g   ?? 0),
            fatG:      (prev?.fatG      ?? 0) + (meal.fat_g     ?? 0),
          }))
        }}
      />

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
