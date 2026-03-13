export type UserRole = 'physician' | 'admin'
export type Country = 'SA' | 'AE'
export type Language = 'en' | 'ar'
export type ObesityRisk = 'low' | 'moderate' | 'high'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  country: Country
  created_at: string
}

export interface Patient {
  id: string
  physician_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: 'male' | 'female'
  country: Country
  created_at: string
}

export interface Assessment {
  id: string
  patient_id: string
  physician_id: string
  date: string
  age_months: number
  weight_kg: number
  height_cm: number
  bmi: number
  bmi_percentile: number
  obesity_risk: ObesityRisk
  notes?: string
  created_at: string
}

export interface Report {
  id: string
  assessment_id: string
  patient_id: string
  content: string
  language: Language
  created_at: string
}
