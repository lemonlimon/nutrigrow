'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter }                   from 'next/navigation'
import { createClient }                from '@supabase/supabase-js'
import { format }                      from 'date-fns'
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
  meal_score:             number | null
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

// ── Meal score derivation (client-side preview; server saves final) ───────────
const SCORE_RANGES_CLIENT: Record<string, [number, number]> = {
  green:  [8, 9],
  yellow: [5, 7],
  red:    [2, 4],
}
function deriveMealScore(tag: string | null): number {
  const [min, max] = SCORE_RANGES_CLIENT[tag ?? 'yellow'] ?? [5, 7]
  return min + Math.floor(Math.random() * (max - min + 1))
}

// ── Layout helpers ────────────────────────────────────────────────────────────
function Shell({ children, isAr }: { children: React.ReactNode; isAr: boolean }) {
  return (
    <div
      dir={isAr ? 'rtl' : undefined}
      lang={isAr ? 'ar' : undefined}
      className="min-h-screen bg-canvas px-4 pt-8 pb-24"
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

// ── Daily Tip card (collapsible, default collapsed) ──────────────────────────
function TipCard({ tip, isAr }: { tip: DailyTip; isAr: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const preview = tip.tip_en.length > 80
    ? tip.tip_en.slice(0, 80).trim() + '…'
    : tip.tip_en

  return (
    <button
      type="button"
      onClick={() => setExpanded(p => !p)}
      style={{
        width:        '100%',
        background:   '#FFFFFF',
        borderRadius: 16,
        padding:      '20px 24px',
        textAlign:    'left',
        border:       '1px solid #E8F5F0',
        borderLeft:   '3px solid #F5A623',
        cursor:       'pointer',
        display:      'block',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p
          className="font-dm-sans uppercase"
          style={{ fontSize: 10, color: '#999999', letterSpacing: '0.12em', margin: 0 }}
        >
          {isAr ? 'نصيحة اليوم' : "Today's Insight"}
        </p>
        <span style={{
          fontSize:   16,
          color:      '#999999',
          display:    'block',
          transition: 'transform 0.2s',
          transform:  expanded ? 'rotate(180deg)' : 'none',
        }}>
          ▾
        </span>
      </div>

      {/* Collapsed preview */}
      {!expanded && (
        <p
          className="font-dm-sans"
          style={{ fontSize: 14, color: '#333333', lineHeight: 1.45, margin: '8px 0 0' }}
        >
          {preview}
        </p>
      )}

      {/* Expanded full content */}
      {expanded && (
        <>
          <p
            className="font-dm-sans"
            style={{ fontSize: 14, color: '#333333', lineHeight: 1.55, margin: '10px 0 0' }}
          >
            {tip.tip_en}
          </p>
          <div style={{ height: 1, background: '#E8F5F0', margin: '14px 0' }} />
          <p
            className="font-tajawal"
            dir="rtl"
            style={{ fontSize: 14, color: '#333333', lineHeight: 1.65, margin: 0, textAlign: 'right' }}
          >
            {tip.tip_ar}
          </p>
        </>
      )}
    </button>
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
    { emoji: '🥩', label: `${protein_g}g protein`, bg: '#FFF0EB', color: '#E8623A' },
    { emoji: '🌾', label: `${carbs_g}g carbs`,     bg: '#FFF8EB', color: '#D4860A' },
    { emoji: '🫒', label: `${fat_g}g fat`,          bg: '#F0FAF5', color: '#1D9E75' },
  ]
  return (
    <div className="flex gap-2 flex-wrap mt-1.5">
      {pills.map(({ emoji, label, bg, color }) => (
        <span
          key={label}
          className="font-dm-sans"
          style={{
            background:   bg,
            borderRadius: 8,
            padding:      '4px 10px',
            fontSize:     12,
            color,
          }}
        >
          {emoji} {label}
        </span>
      ))}
    </div>
  )
}

// ── Meal Score Bar ────────────────────────────────────────────────────────────
function MealScoreBar({ score }: { score: number }) {
  const color =
    score >= 7 ? '#1D9E75'
    : score >= 4 ? '#F5A623'
    :               '#E8623A'
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span className="font-dm-sans" style={{ fontSize: 11, color: '#999' }}>Meal Score</span>
        <span className="font-dm-sans font-bold" style={{ fontSize: 11, color }}>{score}/10</span>
      </div>
      <div style={{ height: 4, background: '#F0F0F0', borderRadius: 99 }}>
        <div style={{
          height:       4,
          width:        `${score * 10}%`,
          background:   color,
          borderRadius: 99,
          transition:   'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

// ── Donut Ring ────────────────────────────────────────────────────────────────
function DonutRing({
  value, goal, color, emoji,
}: {
  value: number
  goal:  number
  color: string
  emoji: string
}) {
  const R            = 50
  const SIZE         = 120
  const circumference = 2 * Math.PI * R
  const pct          = Math.min(value / goal, 1)
  const offset       = circumference * (1 - pct)
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        r={R} cx={SIZE / 2} cy={SIZE / 2}
        fill="none"
        stroke="#F0F0F0"
        strokeWidth="10"
      />
      {/* Fill */}
      <circle
        r={R} cx={SIZE / 2} cy={SIZE / 2}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      {/* Center emoji */}
      <text
        x={SIZE / 2} y={SIZE / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="24"
      >
        {emoji}
      </text>
    </svg>
  )
}

// ── Hero Dashboard ────────────────────────────────────────────────────────────
function HeroDashboard({
  calLow, waterMl, weightDeltaKg, enrolledAt,
  onCalTap, onWaterTap, onWeightTap,
}: {
  calLow:         number
  waterMl:        number
  weightDeltaKg:  number | null
  enrolledAt:     string
  onCalTap:    () => void
  onWaterTap:  () => void
  onWeightTap: () => void
}) {
  const calColor = calLow > 1800 ? '#E8623A' : '#1D9E75'

  const weightLabel =
    weightDeltaKg === null ? '—'
    : weightDeltaKg === 0  ? '0 kg'
    : weightDeltaKg < 0    ? `${weightDeltaKg.toFixed(1)} kg`
    :                        `+${weightDeltaKg.toFixed(1)} kg`
  const weightColor =
    weightDeltaKg === null ? '#999'
    : weightDeltaKg < 0    ? '#1D9E75'
    : weightDeltaKg > 0    ? '#E8623A'
    :                        '#999'

  const sinceLabel = new Date(enrolledAt).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Top row: calories + water donut cards ── */}
      <div style={{ display: 'flex', gap: 12 }}>

        {/* Calories card */}
        <button
          type="button"
          onClick={onCalTap}
          style={{
            flex:           1,
            background:     '#fff',
            borderRadius:   16,
            border:         '1px solid #F0F0F0',
            padding:        '20px 12px',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            cursor:         'pointer',
            minWidth:       0,
          }}
        >
          <DonutRing value={calLow} goal={1800} color={calColor} emoji="🔥" />
          <p
            className="font-dm-sans font-bold"
            style={{ fontSize: 28, color: '#1A1A1A', margin: '10px 0 0', lineHeight: 1 }}
          >
            {calLow > 0 ? calLow.toLocaleString() : '0'}
          </p>
          <p
            className="font-dm-sans"
            style={{ fontSize: 12, color: '#999', marginTop: 4 }}
          >
            / 1,800 kcal
          </p>
        </button>

        {/* Water card */}
        <button
          type="button"
          onClick={onWaterTap}
          style={{
            flex:           1,
            background:     '#fff',
            borderRadius:   16,
            border:         '1px solid #F0F0F0',
            padding:        '20px 12px',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            cursor:         'pointer',
            minWidth:       0,
          }}
        >
          <DonutRing value={waterMl} goal={2000} color="#3B82F6" emoji="💧" />
          <p
            className="font-dm-sans font-bold"
            style={{ fontSize: 28, color: '#1A1A1A', margin: '10px 0 0', lineHeight: 1 }}
          >
            {waterMl > 0 ? waterMl.toLocaleString() : '0'} ml
          </p>
          <p
            className="font-dm-sans"
            style={{ fontSize: 12, color: '#999', marginTop: 4 }}
          >
            / 2,000 ml goal
          </p>
        </button>

      </div>

      {/* ── Weight stat bar ── */}
      <button
        type="button"
        onClick={onWeightTap}
        style={{
          background:     '#fff',
          borderRadius:   12,
          border:         '1px solid #F0F0F0',
          padding:        '12px 16px',
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          cursor:         'pointer',
          width:          '100%',
        }}
      >
        <span
          className="font-dm-sans font-semibold"
          style={{ fontSize: 14, color: weightColor }}
        >
          ⚖️ {weightLabel} on program
        </span>
        <span
          className="font-dm-sans"
          style={{ fontSize: 12, color: '#999' }}
        >
          Since {sinceLabel}
        </span>
      </button>

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
              : delta > 0 ? '#E8623A'
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
      <div
        className={`flex gap-2 ${isAr ? 'flex-row-reverse' : ''}`}
        style={{ width: '100%', alignItems: 'center' }}
      >
        <input
          type="number"
          inputMode="decimal"
          placeholder={t.weightPlaceholder}
          value={value}
          onChange={e => setValue(e.target.value)}
          className={`flex-1 px-4 py-3 border border-gray-200 rounded-btn text-gray-900 text-base
                      focus:outline-none focus:ring-2 focus:ring-brand-mid
                      ${isAr ? 'font-tajawal text-right' : 'font-dm-sans'}`}
          style={{ minWidth: 0 }}
        />
        <div
          className="flex rounded-btn border border-gray-200 overflow-hidden text-sm font-dm-sans"
          style={{ flexShrink: 0 }}
        >
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
  patient, isAr, onConfirmed, onPickFile,
}: {
  patient:     Patient
  isAr:        boolean
  onConfirmed: (meal: FoodLog, calLow: number, calHigh: number) => void
  onPickFile?: (trigger: () => void) => void
}) {
  const t       = T[isAr ? 'ar' : 'en']
  const fileRef = useRef<HTMLInputElement>(null)

  // Register file-picker trigger with parent so the floating FAB can call it
  useEffect(() => {
    onPickFile?.(() => fileRef.current?.click())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    meal_score:              number
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
      setPendingResult({ ...json.data, meal_score: deriveMealScore(json.data.tag) })
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

      // Server returns the authoritative meal_score; fall back to client preview
      const savedScore: number = (json.data?.meal_score as number | undefined) ?? pendingResult.meal_score

      const confirmedMeal: FoodLog = {
        dish_name:              pendingResult.dish_name,
        tag:                    pendingResult.tag,
        note_en:                pendingResult.note_en,
        calories_estimate_low:  pendingResult.calories_estimate_low  ?? null,
        calories_estimate_high: pendingResult.calories_estimate_high ?? null,
        protein_g:              pendingResult.protein_g ?? null,
        carbs_g:                pendingResult.carbs_g   ?? null,
        fat_g:                  pendingResult.fat_g     ?? null,
        meal_score:             savedScore,
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
                <MealScoreBar score={pendingResult.meal_score} />
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
      {lastMeal.meal_score != null && <MealScoreBar score={lastMeal.meal_score} />}

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
  low, mealCount, proteinG, carbsG, fatG, onTap,
}: {
  low:       number
  mealCount: number
  proteinG:  number
  carbsG:    number
  fatG:      number
  onTap?:    () => void
}) {
  // Use calories_estimate_low as the "consumed" figure (conservative estimate)
  const consumed    = low
  const pct         = Math.min(100, Math.round((consumed / CALORIE_GOAL) * 100))
  const isOverGoal  = consumed > CALORIE_GOAL
  const diff        = Math.abs(consumed - CALORIE_GOAL)
  const offset      = RING_CIRC * (1 - pct / 100)
  const ringColor   = isOverGoal ? '#E8623A' : '#1D9E75'
  const calColor    = isOverGoal ? '#E8623A' : '#0D5C45'

  const MACROS = [
    { emoji: '🥩', label: 'Protein', value: proteinG },
    { emoji: '🌾', label: 'Carbs',   value: carbsG   },
    { emoji: '🫒', label: 'Fat',     value: fatG     },
  ]

  return (
    <div
      onClick={mealCount === 0 ? onTap : undefined}
      style={{
        background:   '#fff',
        borderRadius: 16,
        padding:      20,
        boxShadow:    '0 1px 4px rgba(0,0,0,0.06)',
        cursor:       mealCount === 0 ? 'pointer' : undefined,
      }}
    >
      <p
        className="font-dm-sans uppercase"
        style={{ fontSize: 12, color: '#999', letterSpacing: '0.08em', marginBottom: 12 }}
      >
        {"Today's Calories"}
      </p>

      {mealCount === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8, paddingTop: 4, paddingBottom: 4 }}>
          <svg width={88} height={88} viewBox="0 0 88 88">
            <circle
              cx={44} cy={44} r={34}
              fill="none" stroke="#E0E0E0" strokeWidth={7}
              strokeDasharray="6 4"
            />
            <text x={44} y={44} textAnchor="middle" dominantBaseline="central" fontSize="24">🍽️</text>
          </svg>
          <p className="font-dm-sans" style={{ fontSize: 13, color: '#CCC', margin: 0 }}>
            0 / 1,800 kcal
          </p>
          <p className="font-dm-sans" style={{ fontSize: 12, color: '#BBB', fontStyle: 'italic', margin: 0 }}>
            Tap 📸 to log your first meal today
          </p>
        </div>
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

// ── Calendar Date Strip ───────────────────────────────────────────────────────
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

function DateStrip({ loggedDates, topOffset = 52 }: { loggedDates: Set<string>; topOffset?: number }) {
  const todayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [])

  const today    = new Date()
  const todayStr = today.toDateString()

  // 28 days: 21 back + today (index 21) + 6 ahead
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - 21 + i)
    return d
  })

  return (
    // Outer sticky wrapper — contains month header + scrollable row
    <div
      style={{
        position:   'sticky',
        top:        topOffset,
        zIndex:     40,
        background: '#F2F2F7',
      }}
    >
      {/* Static month/year label */}
      <p
        className="font-dm-sans"
        style={{ fontSize: 13, color: '#666', textAlign: 'center', padding: '8px 0 4px', margin: 0 }}
      >
        {format(today, 'MMMM yyyy')}
      </p>

      {/* Scrollable day cells */}
      <div
        className="mizan-cal-strip"
        style={{
          display:        'flex',
          overflowX:      'scroll',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          padding:        '0 8px 14px',
          gap:            4,
        } as React.CSSProperties}
      >
        {days.map((d, i) => {
          const dStr        = d.toDateString()
          const isToday     = dStr === todayStr
          const isFuture    = d > today && !isToday
          const hasLog      = loggedDates.has(dStr)
          const isPast      = !isToday && !isFuture
          // Show month label on 1st of month OR first cell in array
          const showMonth   = d.getDate() === 1 || i === 0

          // Circle appearance
          const circleBg: string =
            isToday ? '#0D5C45' :
            isFuture ? 'transparent' :
            'white'
          const circleBorder: string =
            isToday && hasLog ? '3px solid #1D9E75' :
            isToday           ? 'none' :
            hasLog            ? '2px solid #1D9E75' :
            isFuture          ? '1.5px solid #EEEEEE' :
                                '1.5px solid #E0E0E0'
          const numColor = isToday ? 'white' : hasLog ? '#1D9E75' : '#CCC'
          const numBold  = isToday || hasLog

          // Dot appearance
          const showDot   = (isToday && hasLog) || isPast
          const dotBg     = hasLog ? (isToday ? 'white' : '#1D9E75') : 'transparent'
          const dotBorder = isPast && !hasLog ? '1px solid #CCC' : 'none'

          return (
            <div
              key={i}
              ref={isToday ? todayRef : undefined}
              style={{
                display:         'flex',
                flexDirection:   'column',
                alignItems:      'center',
                minWidth:        44,
                scrollSnapAlign: 'center',
                flexShrink:      0,
              } as React.CSSProperties}
            >
              {/* Month boundary label — always reserves space, visible on boundary */}
              <span
                className="font-dm-sans uppercase"
                style={{
                  fontSize:   10,
                  color:      showMonth ? '#999' : 'transparent',
                  marginBottom: 2,
                  lineHeight: 1,
                  userSelect: 'none',
                }}
              >
                {format(d, 'MMM')}
              </span>

              {/* Day letter */}
              <span
                className="font-dm-sans"
                style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 4, lineHeight: 1 }}
              >
                {DAY_LETTERS[d.getDay()]}
              </span>

              {/* Circle */}
              <div
                style={{
                  width:          40,
                  height:         40,
                  borderRadius:   '50%',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  background:     circleBg,
                  border:         circleBorder,
                  boxSizing:      'border-box',
                }}
              >
                <span
                  className="font-dm-sans"
                  style={{ fontSize: 14, color: numColor, fontWeight: numBold ? 700 : 400 }}
                >
                  {d.getDate()}
                </span>
              </div>

              {/* Consistent dot row */}
              <div
                style={{
                  width:        3,
                  height:       3,
                  borderRadius: '50%',
                  marginTop:    4,
                  background:   showDot ? dotBg : 'transparent',
                  border:       showDot ? dotBorder : 'none',
                  boxSizing:    'border-box',
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
// ── Admin impersonation banner ────────────────────────────────────────────────
function AdminBanner({ patientName }: { patientName: string }) {
  const router = useRouter()

  const handleExit = async () => {
    await fetch('/api/admin/exit', { method: 'POST' })
    router.push('/admin')
  }

  return (
    <div
      className="font-dm-sans"
      style={{
        position:       'sticky',
        top:            0,
        zIndex:         60,
        background:     '#FFF8EB',
        borderBottom:   '2px solid #F5A623',
        padding:        '8px 20px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        height:         36,
        boxSizing:      'border-box',
      }}
    >
      <span style={{ fontSize: 13, color: '#D4860A' }}>
        👁 Admin view: <strong>{patientName}</strong>
      </span>
      <button
        type="button"
        onClick={handleExit}
        style={{
          fontSize:   13,
          color:      '#D4860A',
          background: 'transparent',
          border:     'none',
          cursor:     'pointer',
          fontWeight: 600,
          padding:    0,
        }}
      >
        Exit
      </button>
    </div>
  )
}

export default function PatientHomeClient({
  adminPatientId   = null,
  adminPatientName = null,
}: {
  adminPatientId?:   string | null
  adminPatientName?: string | null
} = {}) {
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
  const [waterMl,      setWaterMl]      = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [greeting,     setGreeting]     = useState('Good to see you')
  const [loggedDates,  setLoggedDates]  = useState<Set<string>>(new Set())
  const [showMenu,     setShowMenu]     = useState(false)

  // Scroll-anchor refs for hero dashboard cards
  const weightRef          = useRef<HTMLDivElement>(null)
  const foodRef            = useRef<HTMLDivElement>(null)
  const waterRef           = useRef<HTMLDivElement>(null)
  const triggerFoodPickRef = useRef<(() => void) | null>(null)
  const scrollTo  = useCallback((ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleSignOut = async () => {
    await supabase().auth.signOut()
    window.location.href = '/login'
  }

  // Time-based greeting (client-side only — avoids server/client hydration mismatch)
  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 5 && h < 12)       setGreeting('Good morning')
    else if (h >= 12 && h < 17) setGreeting('Good afternoon')
    else if (h >= 17 && h < 21) setGreeting('Good evening')
    else                         setGreeting('Good night')
  }, [])

  const isAr          = patient?.preferred_language === 'ar'
  const t             = T[isAr ? 'ar' : 'en']
  const isRamadanMode = contextLogs.filter(l => l.context === 'ramadan').length >= 3

  useEffect(() => {
    const load = async () => {
      const db = supabase()

      const { data: { user }, error: authErr } = await db.auth.getUser()
      if (authErr || !user) { window.location.href = '/login'; return }

      // Admin impersonation: if adminPatientId is provided (set by server wrapper
      // after verifying the admin cookie), load that patient directly.
      // Requires RLS policy: admin users can SELECT from patients table for all rows.
      const patQuery = adminPatientId
        ? db.from('patients')
            .select('id, first_name, preferred_language, weight_kg, enrolled_at')
            .eq('id', adminPatientId)
            .single()
        : db.from('patients')
            .select('id, first_name, preferred_language, weight_kg, enrolled_at')
            .eq('user_id', user.id)
            .single()

      const { data: pat, error: patErr } = await patQuery
      if (patErr || !pat) { window.location.href = '/login'; return }
      setPatient(pat as Patient)

      // Existing queries
      const { data: wLogs } = await db
        .from('weight_logs')
        .select('weight_kg, logged_at')
        .eq('patient_id', pat.id)
        .order('logged_at', { ascending: false })
        .limit(20)
      const seen = new Set<string>()
      const deduped = (wLogs ?? []).filter(log => {
        const date = new Date(log.logged_at).toDateString()
        if (seen.has(date)) return false
        seen.add(date)
        return true
      })
      setWeightLogs(deduped.slice(0, 8))

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
          .select('dish_name, tag, note_en, calories_estimate_low, calories_estimate_high, protein_g, carbs_g, fat_g, meal_score, meal_type, logged_at')
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

      // Fetch today's water (fire-and-forget) — LOCAL date via date-fns (avoids UTC-offset bug)
      const today = format(new Date(), 'yyyy-MM-dd')
      fetch(`/api/water-log?patientId=${pat.id}&date=${today}`)
        .then(r => r.json())
        .then(json => { if (json.success) setWaterMl(json.data.glasses ?? 0) })
        .catch(() => { /* fail silently */ })

      // Fetch daily tip (fire-and-forget — page renders without blocking)
      fetch(`/api/daily-tip?patientId=${pat.id}&date=${today}`)
        .then(r => r.json())
        .then(json => { if (json.success) setDailyTip(json.data) })
        .catch(() => { /* fail silently — tip is non-critical */ })

      // Fetch calendar strip: 28 days (21 back + today + 6 ahead) (fire-and-forget)
      const calStart = new Date()
      calStart.setDate(calStart.getDate() - 21)
      calStart.setHours(0, 0, 0, 0)
      const calEnd = new Date()
      calEnd.setDate(calEnd.getDate() + 7)
      db.from('food_logs')
        .select('logged_at')
        .eq('patient_id', pat.id)
        .gte('logged_at', calStart.toISOString())
        .lt('logged_at', calEnd.toISOString())
        .then(({ data: calLogs }) => {
          setLoggedDates(new Set(
            calLogs?.map(l => new Date(l.logged_at).toDateString()) ?? []
          ))
        })

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

  // Weight delta for hero card (latest log vs enrolled weight)
  const weightDelta = weightLogs.length > 0
    ? Math.round((weightLogs[0].weight_kg - patient.weight_kg) * 10) / 10
    : null

  return (
    <>
    {/* ── Admin impersonation banner (only shown when admin is viewing) ── */}
    {adminPatientName && (
      <AdminBanner patientName={adminPatientName} />
    )}

    {/* ── Sticky app header ── */}
    <div
      style={{
        position:       'sticky',
        top:            adminPatientName ? 36 : 0,
        zIndex:         50,
        height:         52,
        background:     '#FAFAF8',
        borderBottom:   '1px solid #F0F0F0',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '0 20px',
      }}
    >
      <span className="font-tajawal" style={{ fontSize: 22, color: '#0D5C45', lineHeight: 1 }}>
        ميزان
      </span>
      <span className="font-playfair" style={{ fontSize: 16, letterSpacing: '0.12em', color: '#1A1A1A' }}>
        MIZAN
      </span>

      {/* Avatar + sign-out dropdown */}
      {patient && (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowMenu(m => !m)}
            style={{
              width:          32,
              height:         32,
              borderRadius:   '50%',
              background:     '#E8F5F0',
              color:          '#0D5C45',
              fontSize:       14,
              fontWeight:     700,
              border:         'none',
              cursor:         'pointer',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontFamily:     'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
            }}
          >
            {patient.first_name[0]?.toUpperCase()}
          </button>

          {showMenu && (
            <>
              {/* Click-away backdrop */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                onClick={() => setShowMenu(false)}
              />
              <div
                style={{
                  position:     'absolute',
                  top:          'calc(100% + 8px)',
                  right:        0,
                  background:   'white',
                  borderRadius: 12,
                  boxShadow:    '0 4px 20px rgba(0,0,0,0.12)',
                  padding:      '8px 0',
                  zIndex:       100,
                  minWidth:     160,
                }}
              >
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{
                    display:    'block',
                    width:      '100%',
                    padding:    '12px 16px',
                    textAlign:  'left',
                    background: 'none',
                    border:     'none',
                    fontSize:   14,
                    color:      '#E8623A',
                    fontFamily: 'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
                    cursor:     'pointer',
                  }}
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>

    {/* ── Calendar Date Strip — full-width, sticky below header ── */}
    <DateStrip loggedDates={loggedDates} topOffset={adminPatientName ? 88 : 52} />

    <Shell isAr={isAr}>

      {/* Greeting + streak */}
      <div className="px-1">
        <p className={`text-xl text-gray-900 ${isAr ? 'font-tajawal' : 'font-playfair'}`}>
          {isAr
            ? t.greeting(patient.first_name)
            : `${greeting}, ${patient.first_name}. ${
                greeting === 'Good morning'   ? '🌅' :
                greeting === 'Good afternoon' ? '☀️' :
                greeting === 'Good evening'   ? '🌆' : '🌙'
              }`
          }
        </p>
        {streak >= 1 && (
          <p
            className="font-dm-sans mt-1"
            style={{ fontSize: 13, color: streak >= 2 ? '#0D5C45' : '#666' }}
          >
            {streak >= 2 ? `🔥 ${streak} day streak` : 'Good start — come back tomorrow'}
          </p>
        )}
      </div>

      {/* ── Hero Dashboard ── */}
      <HeroDashboard
        calLow={todayCalories?.low ?? 0}
        waterMl={waterMl}
        weightDeltaKg={weightDelta}
        enrolledAt={patient.enrolled_at}
        onCalTap={() => scrollTo(foodRef)}
        onWaterTap={() => scrollTo(waterRef)}
        onWeightTap={() => scrollTo(weightRef)}
      />

      {/* ── Weight chart + history ── */}
      <div ref={weightRef}>
        <WeightSection
          patient={patient}
          weightLogs={weightLogs}
          isAr={isAr}
          onSaved={log => setWeightLogs(prev => [log, ...prev].slice(0, 8))}
        />
      </div>

      {/* ── Food section: calorie ring + log + last meal ── */}
      <div ref={foodRef} className="space-y-4">
        <CalorieRingCard
          low={todayCalories?.low       ?? 0}
          mealCount={todayCalories?.mealCount ?? 0}
          proteinG={todayCalories?.proteinG   ?? 0}
          carbsG={todayCalories?.carbsG       ?? 0}
          fatG={todayCalories?.fatG           ?? 0}
          onTap={() => scrollTo(foodRef)}
        />

        <FoodSection
          patient={patient}
          isAr={isAr}
          onPickFile={fn => { triggerFoodPickRef.current = fn }}
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

        {lastMeal && <LastMealSection lastMeal={lastMeal} isAr={isAr} />}
      </div>

      {/* ── Water tracker ── */}
      <div ref={waterRef}>
        <WaterCard patientId={patient.id} />
      </div>

      {/* ── Daily context ── */}
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

      {/* ── Today's Insight (collapsible, bottom of page) ── */}
      {dailyTip && <TipCard tip={dailyTip} isAr={isAr} />}

    </Shell>

    {/* ── Floating Camera FAB ── */}
    <style>{`
      @keyframes breathe {
        0%, 100% {
          transform: scale(1);
          box-shadow: 0 4px 16px rgba(232,98,58,0.4);
        }
        50% {
          transform: scale(1.18);
          box-shadow: 0 6px 28px rgba(232,98,58,0.7);
        }
      }
      @keyframes twinkle {
        0%, 100% { opacity: 0; transform: scale(0.4) rotate(0deg); }
        50%       { opacity: 1; transform: scale(1.2) rotate(180deg); }
      }
      .mizan-fab:hover, .mizan-fab:active { transform: scale(1.08) !important; }
      .mizan-cal-strip::-webkit-scrollbar { display: none; }
    `}</style>
    <div style={{ position: 'fixed', bottom: 88, right: 20, zIndex: 100 }}>
      {(todayCalories?.mealCount ?? 0) === 0 && (
        <>
          <span style={{
            position: 'absolute', top: -6, right: -4,
            fontSize: 10, color: '#F5A623', lineHeight: 1,
            animation: 'twinkle 1.8s ease-in-out infinite',
            animationDelay: '0s',
            pointerEvents: 'none',
          }}>✦</span>
          <span style={{
            position: 'absolute', top: -4, left: -6,
            fontSize: 9, color: '#FFFFFF', lineHeight: 1,
            animation: 'twinkle 1.8s ease-in-out infinite',
            animationDelay: '0.6s',
            pointerEvents: 'none',
          }}>✦</span>
          <span style={{
            position: 'absolute', bottom: -4, right: -8,
            fontSize: 11, color: '#FFD700', lineHeight: 1,
            animation: 'twinkle 1.8s ease-in-out infinite',
            animationDelay: '1.2s',
            pointerEvents: 'none',
          }}>✦</span>
        </>
      )}
      <button
        type="button"
        onClick={() => triggerFoodPickRef.current?.()}
        className="mizan-fab"
        aria-label="Log a meal"
        style={{
          width:          60,
          height:         60,
          borderRadius:   '50%',
          background:     (todayCalories?.mealCount ?? 0) === 0 ? '#E8623A' : '#1A1A1A',
          border:         'none',
          boxShadow:      (todayCalories?.mealCount ?? 0) > 0
            ? '0 4px 16px rgba(0,0,0,0.25)'
            : undefined,
          animation:      (todayCalories?.mealCount ?? 0) > 0
            ? undefined
            : 'breathe 2.2s ease-in-out infinite',
          cursor:         'pointer',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          transition:     'transform 150ms ease',
        }}
      >
        <svg
          width="26" height="26" viewBox="0 0 24 24"
          fill="none" stroke="white" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </button>
    </div>
    </>
  )
}
