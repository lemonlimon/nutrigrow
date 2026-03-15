'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────
export type OnboardingMode     = 'invited' | 'direct'
export type GoalType           = 'lose_weight' | 'maintain_weight' | 'gain_muscle'
export type GenderType         = 'male' | 'female' | 'other'
export type UnitSystem         = 'imperial' | 'metric'
export type WorkoutFrequency   = '0-2' | '3-5' | '6+'
export type DietType           = 'classic' | 'pescatarian' | 'vegetarian' | 'vegan'
export type ReferralSource     = 'youtube' | 'tiktok' | 'instagram' | 'friend' | 'other'

export interface OnboardingData {
  // ── Mode ──────────────────────────────────────────────────────────────
  mode:           OnboardingMode | null
  inviteToken:    string | null
  prefilledEmail: string | null
  clinicId:       string | null
  patientId:      string | null   // from invite_tokens.patient_id

  // ── Step 1: Goal ──────────────────────────────────────────────────────
  goal_type: GoalType | null

  // ── Step 2: Gender ────────────────────────────────────────────────────
  gender: GenderType | null

  // ── Step 3: Height & Weight ───────────────────────────────────────────
  unit:                 UnitSystem
  height_ft:            number
  height_in:            number
  height_cm:            number
  current_weight:       number    // in current unit
  current_weight_unit:  'lbs' | 'kg'

  // ── Step 4: Birthday ──────────────────────────────────────────────────
  date_of_birth: string | null    // 'YYYY-MM-DD'

  // ── Step 5: Workout ───────────────────────────────────────────────────
  workout_frequency: WorkoutFrequency | null

  // ── Step 6: Target weight ─────────────────────────────────────────────
  target_weight: number | null    // in current unit

  // ── Step 8: Speed ─────────────────────────────────────────────────────
  weight_loss_speed: number | null   // lbs/week or kg/week

  // ── Step 9: Barriers ──────────────────────────────────────────────────
  barriers: string[]

  // ── Step 10: Diet ─────────────────────────────────────────────────────
  diet_type: DietType | null

  // ── Step 11: Wellness goals ───────────────────────────────────────────
  wellness_goals: string[]

  // ── Step 13: Rollover ─────────────────────────────────────────────────
  rollover_calories: boolean | null

  // ── Step 14: Exercise calories ────────────────────────────────────────
  add_exercise_calories: boolean | null

  // ── Step 16: Referral ─────────────────────────────────────────────────
  referral_source: ReferralSource | null
}

const DEFAULT_DATA: OnboardingData = {
  mode:           null,
  inviteToken:    null,
  prefilledEmail: null,
  clinicId:       null,
  patientId:      null,

  goal_type:     null,
  gender:        null,

  unit:                'imperial',
  height_ft:           5,
  height_in:           6,
  height_cm:           168,
  current_weight:      154,
  current_weight_unit: 'lbs',

  date_of_birth:     null,
  workout_frequency: null,
  target_weight:     null,
  weight_loss_speed: null,

  barriers:       [],
  diet_type:      null,
  wellness_goals: [],

  rollover_calories:     null,
  add_exercise_calories: null,
  referral_source:       null,
}

// ── Context ───────────────────────────────────────────────────────────────
interface CtxValue {
  data:   OnboardingData
  update: (partial: Partial<OnboardingData>) => void
  reset:  () => void
}

const Ctx = createContext<CtxValue | null>(null)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>(DEFAULT_DATA)

  const update = (partial: Partial<OnboardingData>) =>
    setData(prev => ({ ...prev, ...partial }))

  const reset = () => setData(DEFAULT_DATA)

  return <Ctx.Provider value={{ data, update, reset }}>{children}</Ctx.Provider>
}

export function useOnboarding() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider')
  return ctx
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Convert lbs → kg, rounded to 1dp */
export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 10) / 10
}

/** Convert cm → ft+in */
export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalIn = cm / 2.54
  return { ft: Math.floor(totalIn / 12), inch: Math.round(totalIn % 12) }
}

/** Convert ft+in → cm */
export function ftInToCm(ft: number, inch: number): number {
  return Math.round((ft * 12 + inch) * 2.54)
}

/**
 * Harris-Benedict TDEE estimate (kcal/day).
 * gender: 'male' | 'female', weight in kg, height in cm, age in years, activity 1.2–1.9
 */
export function calcTDEE(
  gender:   string,
  weightKg: number,
  heightCm: number,
  ageDays:  number,
  activity: number = 1.375,
): number {
  const ageYears = ageDays / 365
  const bmr = gender === 'female'
    ? 655.1 + 9.563 * weightKg + 1.850 * heightCm - 4.676 * ageYears
    : 66.47 + 13.75 * weightKg + 5.003 * heightCm - 6.755 * ageYears
  return Math.round(bmr * activity)
}
