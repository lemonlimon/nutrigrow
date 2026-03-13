/**
 * MIZAN Health — Clinical Risk Calculator
 *
 * BMI Cutoff Sources:
 * [1] WHO Standard: World Health Organization (2000). Obesity: Preventing and
 *     Managing the Global Epidemic. WHO Technical Report Series 894. Geneva: WHO.
 *
 * [2] Gulf/Asian-Adjusted: WHO Expert Consultation (2004). Appropriate
 *     body-mass index for Asian populations and its implications for policy
 *     and intervention strategies. The Lancet, 363(9403), 157–163.
 *     https://doi.org/10.1016/S0140-6736(03)15268-3
 *     NOTE: This paper covers Asia broadly. Middle Eastern application is
 *     extrapolated — [VERIFY] with Saudi MOH CPG for KSA-specific thresholds.
 *
 * Waist Circumference Source:
 * [3] IDF Consensus (2006). The IDF Consensus Worldwide Definition of the
 *     Metabolic Syndrome. International Diabetes Federation.
 *     Middle East / Arab populations: Men ≥94 cm, Women ≥80 cm.
 *     [VERIFY] for current KSA/SFDA guidance updates post-2022.
 *
 * Risk Scoring:
 *     Composite point-based model drawing on AAP CPG 2023 risk factor weighting
 *     (Pediatrics 151(2):e2022060640) adapted for adult Gulf populations.
 *     [VERIFY] against Saudi MOH Childhood Obesity CPG for adolescent ranges.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskTier = 'low' | 'moderate' | 'high' | 'very-high'
export type TrafficLight = 'green' | 'yellow' | 'red'

export interface BMIClassification {
  bmi: number
  who: { category: string; color: string; range: string }
  gulf: { category: string; color: string; range: string }
}

export interface RiskFactor {
  label: string
  value: string
  points: number
  flag: boolean
  note?: string
}

export interface RiskResult {
  bmi: number
  bmiClassification: BMIClassification
  riskScore: number
  maxScore: number
  riskTier: RiskTier
  riskLabel: string
  trafficLight: TrafficLight
  riskFactors: RiskFactor[]
  recommendations: string[]
  physicianAlert?: string
}

// ─── BMI Classification ───────────────────────────────────────────────────────

export function classifyBMI(bmi: number): BMIClassification {
  // WHO Standard [1]
  const whoCategory =
    bmi < 18.5 ? 'Underweight' :
    bmi < 25   ? 'Normal weight' :
    bmi < 30   ? 'Overweight' :
    bmi < 35   ? 'Obesity Class I' :
    bmi < 40   ? 'Obesity Class II' :
                 'Obesity Class III'

  const whoColor = bmi < 25 ? 'green' : bmi < 30 ? 'yellow' : 'red'

  const whoRange =
    bmi < 18.5 ? '<18.5' :
    bmi < 25   ? '18.5–24.9' :
    bmi < 30   ? '25.0–29.9' :
    bmi < 35   ? '30.0–34.9' :
    bmi < 40   ? '35.0–39.9' : '≥40.0'

  // Gulf/Asian-adjusted [2]
  const gulfCategory =
    bmi < 18.5 ? 'Underweight' :
    bmi < 23   ? 'Normal weight' :
    bmi < 27.5 ? 'Overweight' :
    bmi < 30   ? 'Obesity Class I' :
    bmi < 35   ? 'Obesity Class II' :
    bmi < 40   ? 'Obesity Class III' :
                 'Obesity Class III (Severe)'

  const gulfColor = bmi < 23 ? 'green' : bmi < 27.5 ? 'yellow' : 'red'

  const gulfRange =
    bmi < 18.5 ? '<18.5' :
    bmi < 23   ? '18.5–22.9' :
    bmi < 27.5 ? '23.0–27.4' :
    bmi < 30   ? '27.5–29.9' :
    bmi < 35   ? '30.0–34.9' :
    bmi < 40   ? '35.0–39.9' : '≥40.0'

  return {
    bmi,
    who:  { category: whoCategory,  color: whoColor,  range: whoRange  },
    gulf: { category: gulfCategory, color: gulfColor, range: gulfRange },
  }
}

// ─── Waist Circumference ─────────────────────────────────────────────────────

export function classifyWaist(
  waistCm: number,
  sex: 'male' | 'female'
): { flag: boolean; threshold: number; source: string } {
  // IDF 2006 — Middle East/Arab thresholds [3]
  const threshold = sex === 'male' ? 94 : 80
  return {
    flag: waistCm >= threshold,
    threshold,
    source: 'IDF 2006 Middle East consensus [VERIFY]',
  }
}

// ─── Full Risk Calculator ─────────────────────────────────────────────────────

export function calculateRisk(input: {
  bmi: number
  sex: 'male' | 'female'
  age: number
  waistCm?: number
  activity: string
  screenTime: string
  fastFood: string
  familyHistory: string
  country: 'SA' | 'AE'
}): RiskResult {
  const { bmi, sex, age, waistCm, activity, screenTime, fastFood, familyHistory, country } = input
  const factors: RiskFactor[] = []
  let score = 0

  // ── BMI (Gulf-adjusted for scoring) ────────────────────────────────────────
  const bmiPts =
    bmi < 23   ? 0 :
    bmi < 27.5 ? 2 :
    bmi < 30   ? 3 :
    bmi < 35   ? 4 :
    bmi < 40   ? 5 : 6
  score += bmiPts
  factors.push({
    label: 'BMI (Gulf-adjusted)',
    value: `${bmi.toFixed(1)} kg/m²`,
    points: bmiPts,
    flag: bmiPts >= 3,
  })

  // ── Waist Circumference ─────────────────────────────────────────────────────
  if (waistCm) {
    const w = classifyWaist(waistCm, sex)
    const wPts = w.flag ? 3 : 0
    score += wPts
    factors.push({
      label: 'Waist Circumference',
      value: `${waistCm} cm`,
      points: wPts,
      flag: w.flag,
      note: w.flag
        ? `Exceeds IDF threshold (${w.threshold} cm for ${sex})`
        : `Within IDF threshold (${w.threshold} cm for ${sex})`,
    })
  }

  // ── Physical Activity ───────────────────────────────────────────────────────
  const actPts =
    activity === '5+' || activity === '4' ? 0 :
    activity === '3'  || activity === '2' ? 1 :
    activity === '1'  ? 2 : 3
  score += actPts
  factors.push({
    label: 'Physical Activity',
    value: activity === '0' ? 'Sedentary' : `${activity}× / week`,
    points: actPts,
    flag: actPts >= 2,
  })

  // ── Screen Time ─────────────────────────────────────────────────────────────
  const scrPts =
    screenTime === '<1' || screenTime === '1-2' ? 0 :
    screenTime === '2-3' ? 1 :
    screenTime === '3-4' ? 2 : 3
  score += scrPts
  factors.push({
    label: 'Screen Time',
    value: `${screenTime} hrs / day`,
    points: scrPts,
    flag: scrPts >= 2,
  })

  // ── Fast Food ───────────────────────────────────────────────────────────────
  const ffPts =
    fastFood === '0' ? 0 :
    fastFood === '1' ? 1 :
    fastFood === '2' ? 2 :
    fastFood === '3' ? 3 : 4
  score += ffPts
  factors.push({
    label: 'Fast Food / Takeaway',
    value: fastFood === '0' ? 'Never' : `${fastFood}× / week`,
    points: ffPts,
    flag: ffPts >= 3,
  })

  // ── Family History ──────────────────────────────────────────────────────────
  const fhPts =
    familyHistory === 'none' ? 0 :
    familyHistory === 'one'  ? 2 : 4
  score += fhPts
  factors.push({
    label: 'Family History of Obesity',
    value:
      familyHistory === 'none' ? 'None' :
      familyHistory === 'one'  ? 'One parent' : 'Both parents',
    points: fhPts,
    flag: fhPts >= 4,
  })

  const maxScore = 6 + (waistCm ? 3 : 0) + 3 + 3 + 4 + 4

  // ── Risk Tier ───────────────────────────────────────────────────────────────
  const riskTier: RiskTier =
    score <= 3  ? 'low' :
    score <= 8  ? 'moderate' :
    score <= 13 ? 'high' : 'very-high'

  const riskLabel =
    riskTier === 'low'       ? 'Low Risk' :
    riskTier === 'moderate'  ? 'Moderate Risk' :
    riskTier === 'high'      ? 'High Risk' : 'Very High Risk'

  const trafficLight: TrafficLight =
    riskTier === 'low' ? 'green' :
    riskTier === 'moderate' ? 'yellow' : 'red'

  // ── Recommendations ─────────────────────────────────────────────────────────
  const recs: string[] = []

  if (actPts >= 2)
    recs.push('Increase to ≥150 min/week moderate-intensity activity (WHO Physical Activity Guidelines 2020)')
  if (scrPts >= 2)
    recs.push('Reduce recreational screen time to <2 hrs/day')
  if (ffPts >= 2)
    recs.push('Reduce fast food intake; structured dietitian referral recommended')
  if (fhPts >= 2)
    recs.push('Strong family history — consider early metabolic screening: fasting glucose, HbA1c, lipid panel')
  if (bmi >= 30)
    recs.push('BMI ≥30: Initiate structured lifestyle intervention (diet + physical activity programme)')
  if (bmi >= 35)
    recs.push('BMI ≥35 with comorbidity — evaluate bariatric surgery candidacy per IFSO 2022 criteria [VERIFY SFDA alignment]')
  if (waistCm && classifyWaist(waistCm, sex).flag)
    recs.push('Central adiposity confirmed — prioritise waist reduction; consider endocrinology referral')
  if (recs.length === 0)
    recs.push('Maintain current healthy behaviours. Annual monitoring recommended.')

  // ── KSA/UAE Physician Alerts ────────────────────────────────────────────────
  let physicianAlert: string | undefined
  if (country === 'SA' && age < 18) {
    physicianAlert =
      '⚕️ KSA ALERT: GLP-1 agents (semaglutide, liraglutide) are NOT SFDA-approved for pediatric obesity in KSA as of March 2026. Do NOT include in parent-facing reports.'
  } else if (country === 'AE') {
    physicianAlert =
      '🇦🇪 UAE NOTE: Wegovy (semaglutide) and Saxenda (liraglutide) have differing MOHAP approval statuses. Flag any GLP-1 mention for your explicit clinical review before patient delivery.'
  }

  return {
    bmi,
    bmiClassification: classifyBMI(bmi),
    riskScore: score,
    maxScore,
    riskTier,
    riskLabel,
    trafficLight,
    riskFactors: factors,
    recommendations: recs,
    physicianAlert,
  }
}
