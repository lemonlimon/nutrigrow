export type Country   = 'SA' | 'AE'
export type Language  = 'en' | 'ar'
export type RiskTier  = 'low' | 'moderate' | 'high' | 'very-high'
export type TrafficLight = 'green' | 'yellow' | 'red'
export type Comorbidity  = 'hypertension' | 'type2_diabetes' | 'high_cholesterol'

// ── Patient (placeholder — full table TBD in Phase 2) ────────────────────────
// Physicians link assessments to patients via patient_ref (de-identified string).
// A structured patients table will be added when the patient app is built.

export interface Patient {
  id: string
  physician_id: string
  patient_ref: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: 'male' | 'female'
  country: Country
  created_at: string
}

// ── Physician profile (mirrors public.profiles table) ─────────────────────────

export interface Profile {
  id: string
  full_name: string | null
  name_ar: string | null
  country: Country | null
  clinic_name: string | null
  created_at: string
}

// ── Assessment (mirrors public.assessments table) ─────────────────────────────

export interface Assessment {
  id: string
  physician_id: string
  patient_ref: string | null

  // Form inputs
  country: Country | null
  sex: 'male' | 'female' | null
  age: number | null
  weight_kg: number | null
  height_cm: number | null
  waist_cm: number | null
  activity: string | null
  screen_time: string | null
  fast_food: string | null
  family_history: string | null
  comorbidities: Comorbidity[]
  clinical_notes: string | null

  // Computed results
  bmi_value: number | null
  bmi_category_gulf: string | null
  risk_score: number | null
  max_score: number | null
  risk_tier: RiskTier | null
  traffic_light: TrafficLight | null
  physician_alert: boolean

  // Full result JSON for AI report generation
  assessment_json: Record<string, unknown> | null

  created_at: string
}

// ── Insert payload (subset used when saving a new assessment) ─────────────────

export type AssessmentInsert = Omit<Assessment, 'id' | 'created_at'>

// ── Report (shell — AI report generator is Phase 1 next step) ────────────────

export interface Report {
  id: string
  assessment_id: string
  physician_id: string
  content: string
  language: Language
  created_at: string
}
