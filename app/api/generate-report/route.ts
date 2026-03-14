import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { RiskResult } from '@/lib/riskCalculator'
import type { Country } from '@/types'

// model updated 2026-03-13 — update this string when newer versions are released
const MODEL = 'claude-sonnet-4-6'

// Clinical notes max length: prevents prompt inflation and unbounded token cost
const MAX_NOTES_LENGTH = 1000

const client = new Anthropic()

// ── Exported types (shared with AssessmentForm) ───────────────────────────────

export interface GenerateReportRequest {
  riskResult: RiskResult
  sex: 'male' | 'female'
  age: number
  country: Country
  patientRef: string | null
  clinicalNotes: string | null
}

export interface GenerateReportResponse {
  reportPhysicianEn: string
  reportPhysicianAr: string
  reportPatientEn: string
  reportPatientAr: string
}

// ── Validation helpers ────────────────────────────────────────────────────────

const VALID_SEX = ['male', 'female'] as const
const VALID_COUNTRY = ['SA', 'AE'] as const

function validateRequest(body: unknown): body is GenerateReportRequest {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  if (!b.riskResult || typeof b.riskResult !== 'object') return false
  if (!VALID_SEX.includes(b.sex as 'male' | 'female')) return false
  if (!VALID_COUNTRY.includes(b.country as Country)) return false
  if (typeof b.age !== 'number' || b.age < 18 || b.age > 120) return false
  if (b.clinicalNotes !== null && typeof b.clinicalNotes !== 'string') return false
  if (typeof b.clinicalNotes === 'string' && b.clinicalNotes.length > MAX_NOTES_LENGTH) return false
  return true
}

// ── Prompt template parts (extracted to keep builders under 50 lines) ─────────

function physicianPatientData(req: GenerateReportRequest): string {
  const { riskResult, sex, age, country, patientRef } = req
  const { bmi, bmiClassification, riskScore, maxScore, riskTier, riskLabel, trafficLight, riskFactors, recommendations, physicianAlert } = riskResult
  const ref = patientRef ? `Patient Reference: ${patientRef}` : 'Patient Reference: Not provided'
  const riskFactorLines = riskFactors
    .map(f => `- ${f.label}: ${f.value} (${f.points} pts${f.flag ? ', FLAGGED' : ''})${f.note ? ` — ${f.note}` : ''}`)
    .join('\n')
  const recLines = recommendations.map(r => `- ${r}`).join('\n')
  const alertBlock = physicianAlert ? `CLINICAL FLAG (Physician Eyes Only):\n${physicianAlert}\n\n` : ''
  const notesBlock = req.clinicalNotes ? `Physician Clinical Notes:\n${req.clinicalNotes}\n\n` : ''
  return `PATIENT DATA:
${ref}
Country: ${country === 'SA' ? 'Kingdom of Saudi Arabia' : 'United Arab Emirates'}
Age: ${age} years
Sex: ${sex === 'male' ? 'Male' : 'Female'}
BMI: ${bmi.toFixed(1)} kg/m²
  - WHO classification: ${bmiClassification.who.category} (${bmiClassification.who.range})
  - Gulf-adjusted classification: ${bmiClassification.gulf.category} (${bmiClassification.gulf.range})
Risk Score: ${riskScore} / ${maxScore}
Risk Tier: ${riskLabel} (${riskTier})
Traffic Light: ${trafficLight.toUpperCase()}

RISK FACTOR BREAKDOWN:
${riskFactorLines}

RECOMMENDATIONS:
${recLines}

${alertBlock}${notesBlock}`
}

function physicianStructure(hasAlert: boolean, riskLabel: string): string {
  const n = hasAlert ? ['1', '2', '3', '4', '5', '6'] : ['1', '2', '3', '4', '5']
  return `REPORT STRUCTURE — write exactly in this order:
${hasAlert ? `${n[0]}. Clinical flag (restate the alert concisely in formal medical language — physician eyes only)\n${n[1]}.` : `${n[0]}.`} Opening sentence: "This patient presents with a ${riskLabel} cardiometabolic risk profile."
${hasAlert ? n[2] : n[1]}. BMI section: state WHO and Gulf-adjusted classification. Note clinical significance of the Gulf threshold. Add [VERIFY] if citing a specific guideline.
${hasAlert ? n[3] : n[2]}. Risk score section: summarise the point breakdown, identifying the highest-scoring modifiable factors.
${hasAlert ? n[4] : n[3]}. Recommendations section: use "consider" or "evaluate" framing. Add [VERIFY] where uncertain of guideline source.
${hasAlert ? n[5] : n[4]}. Brief collegial closing line (one sentence).`
}

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildPhysicianPrompt(req: GenerateReportRequest, language: 'en' | 'ar'): string {
  const countryLabel = req.country === 'SA' ? 'Kingdom of Saudi Arabia' : 'United Arab Emirates'
  const langInstruction = language === 'ar'
    ? 'Write the entire report in formal medical Arabic (فصحى مبسطة). The report is addressed to a physician colleague.'
    : 'Write the entire report in English.'

  return `You are a senior clinical specialist writing a structured physician assessment report for a clinical obesity management platform used in ${countryLabel}.

${langInstruction}

IMPORTANT RULES — follow these exactly:
1. If you are uncertain about any clinical claim, drug approval status, citation, or threshold, write [VERIFY] inline. Never hallucinate a confident clinical statement.
2. Physician-facing report. Use precise medical language. Be collegial and direct.
3. The physicianAlert block (if present) MUST appear first, before any other content.
4. Never mention specific drug brand names or make a specific treatment recommendation.
5. Use "consider" or "may meet criteria" language for any pharmacotherapy reference.
6. Output plain text only — no markdown, no bullet symbols (use dashes instead), no pound-sign headers.

${physicianPatientData(req)}
${physicianStructure(!!req.riskResult.physicianAlert, req.riskResult.riskLabel)}

Write the report now:`
}

function buildPatientPrompt(req: GenerateReportRequest, language: 'en' | 'ar'): string {
  const { riskResult, sex, age, country, clinicalNotes } = req
  const { riskLabel, trafficLight, recommendations } = riskResult
  const countryLabel = country === 'SA' ? 'Kingdom of Saudi Arabia' : 'United Arab Emirates'

  const patientSafeRecs = recommendations.filter(
    r => !r.toLowerCase().includes('bariatric') &&
         !r.toLowerCase().includes('pharmacotherapy') &&
         !r.toLowerCase().includes('glp') &&
         !r.toLowerCase().includes('endocrinology')
  )
  const recLines = patientSafeRecs.map(r => `- ${r}`).join('\n')

  // CRITICAL: notes reach the patient prompt only with explicit content exclusion rules
  const notesBlock = clinicalNotes
    ? `Physician note for context only — do NOT mention medications, drug classes, pharmacotherapy, ` +
      `surgical options, or clinical scores. If the note contains clinical findings, translate only ` +
      `the lifestyle implications in plain language. Note: ${clinicalNotes}`
    : ''

  const arabicGenderNote = language === 'ar'
    ? `Use ${sex === 'male' ? 'أنتَ (masculine)' : 'أنتِ (feminine)'} throughout.`
    : ''
  const langInstruction = language === 'ar'
    ? `Write in formal, respectful Arabic (فصحى مبسطة). ${arabicGenderNote} Warm and caring, like a trusted doctor. No slang or dialect.`
    : 'Write in clear, warm, respectful English suitable for an educated adult patient.'

  return `You are a caring physician writing a personal health summary letter for your patient in ${countryLabel}.

${langInstruction}

IMPORTANT RULES — follow exactly:
1. If uncertain about any clinical claim or guideline, write [VERIFY] inline.
2. Do NOT mention BMI numbers, BMI class names, or risk score numbers.
3. Do NOT describe the risk tier label (high, moderate, low) — describe findings in plain language instead.
4. Do NOT mention medications, drug classes, or pharmacotherapy of any kind.
5. Tone: caring doctor, not motivational coach. Warm, direct, respectful. No exclamation points.
6. No cheerleading phrases ("Great job!", "Keep it up!", "You're doing amazing!").
7. Address the patient as "you" — not by name.
8. Output plain text only — no markdown, no pound-sign headers.
9. Letter length: 3–4 short paragraphs.

CLINICAL CONTEXT (for your reference — do NOT copy into the letter):
Overall risk: ${riskLabel} (${trafficLight})
Patient age: ${age} years
Lifestyle recommendations to convey (no jargon):
${recLines}
${notesBlock}

LETTER STRUCTURE:
Paragraph 1: Warm acknowledgment of the assessment and what it showed — no numbers or tier labels.
Paragraph 2: The most important 2–3 lifestyle areas to focus on, explained simply and respectfully.
Paragraph 3: Why regular follow-up and monitoring matters — no cheerleading.
Optional Paragraph 4: If physician notes were provided and relevant, incorporate lifestyle implications only.
Close with a brief professional sign-off (no name needed).

Write the letter now:`
}

// ── Mock responses (used when MOCK_REPORTS=true in .env.local) ───────────────

function buildMockResponse(body: GenerateReportRequest): GenerateReportResponse {
  const { riskResult, sex, age, patientRef } = body
  const { riskLabel, riskScore, maxScore, bmiClassification, physicianAlert } = riskResult
  const ref = patientRef ?? 'N/A'
  const pronoun = sex === 'male' ? 'his' : 'her'

  const reportPhysicianEn =
    (physicianAlert ? `${physicianAlert}\n\n` : '') +
    `[MOCK REPORT — no Anthropic API call was made]\n\n` +
    `This patient presents with a ${riskLabel} cardiometabolic risk profile.\n\n` +
    `Patient Reference: ${ref} | Age: ${age} years | Sex: ${sex}\n` +
    `BMI: WHO — ${bmiClassification.who.category} (${bmiClassification.who.range}) | ` +
    `Gulf-adjusted — ${bmiClassification.gulf.category} (${bmiClassification.gulf.range})\n\n` +
    `Risk Score: ${riskScore} / ${maxScore}\n\n` +
    `The highest-scoring modifiable factors are detailed in the breakdown above. ` +
    `Consider addressing lifestyle factors as a first-line intervention. [VERIFY] clinical thresholds ` +
    `before initiating any pharmacotherapy. A follow-up assessment in 3–6 months is recommended.\n\n` +
    `Thank you for using MIZAN Health.`

  const reportPhysicianAr =
    `[تقرير تجريبي — لم يتم الاتصال بـ Anthropic API]\n\n` +
    `يُقدِّم هذا المريض ملفًا ${riskLabel === 'High Risk' ? 'مرتفع' : 'متوسط'} الخطورة الأيضية القلبية الوعائية.\n\n` +
    `المرجع: ${ref} | العمر: ${age} عامًا\n` +
    `مؤشر كتلة الجسم (معايير الخليج): ${bmiClassification.gulf.category} (${bmiClassification.gulf.range})\n\n` +
    `يُوصى بإجراء تقييم متابعة خلال 3–6 أشهر. [VERIFY]`

  const reportPatientEn =
    `[MOCK PATIENT LETTER — no Anthropic API call was made]\n\n` +
    `Based on ${pronoun} assessment today, there are a few areas that deserve attention ` +
    `to support long-term heart and metabolic health.\n\n` +
    `The most important steps relate to physical activity, dietary habits, and reducing sedentary time. ` +
    `Small, consistent changes in these areas tend to have the most meaningful impact over time.\n\n` +
    `Please schedule a follow-up visit so we can track ${pronoun} progress together. ` +
    `Regular monitoring is an important part of staying ahead of potential health risks.\n\n` +
    `With care,\nYour Physician`

  const reportPatientAr =
    `[رسالة تجريبية للمريض — لم يتم الاتصال بـ Anthropic API]\n\n` +
    `بناءً على نتائج تقييمك اليوم، ثمة جوانب تستحق الاهتمام لدعم صحتك على المدى البعيد.\n\n` +
    `أبرز ما يمكن التركيز عليه هو النشاط البدني، والعادات الغذائية، وتقليل وقت الجلوس الطويل. ` +
    `التغييرات الصغيرة والمنتظمة في هذه المجالات لها أكبر الأثر.\n\n` +
    `أرجو حجز موعد متابعة حتى نتمكن من متابعة تطور حالتك معًا.\n\n` +
    `مع تحياتي،\nطبيبك`

  return { reportPhysicianEn, reportPhysicianAr, reportPatientEn, reportPatientAr }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // ── CRITICAL: Verify authenticated session before touching any data or API ──
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Authentication check failed' }, { status: 500 })
  }

  try {
    const rawBody: unknown = await request.json()

    // ── Input validation — whitelist all fields before building prompts ───────
    if (!validateRequest(rawBody)) {
      return NextResponse.json(
        { error: 'Invalid request: missing or malformed fields.' },
        { status: 400 }
      )
    }

    const body = rawBody

    // ── Mock mode: set MOCK_REPORTS=true in .env.local to skip Anthropic API ──
    if (process.env.MOCK_REPORTS === 'true') {
      return NextResponse.json(buildMockResponse(body))
    }

    // ── Generate all four reports in parallel with a per-call timeout ─────────
    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`Anthropic call timed out after ${ms}ms`)), ms)
        ),
      ])

    const TIMEOUT_MS = 25_000 // 25 s — fits within Vercel Pro 60 s limit with headroom

    const [physicianEnMsg, physicianArMsg, patientEnMsg, patientArMsg] = await Promise.all([
      withTimeout(client.messages.create({ model: MODEL, max_tokens: 1024, messages: [{ role: 'user', content: buildPhysicianPrompt(body, 'en') }] }), TIMEOUT_MS),
      withTimeout(client.messages.create({ model: MODEL, max_tokens: 1024, messages: [{ role: 'user', content: buildPhysicianPrompt(body, 'ar') }] }), TIMEOUT_MS),
      withTimeout(client.messages.create({ model: MODEL, max_tokens: 1024, messages: [{ role: 'user', content: buildPatientPrompt(body, 'en') }] }), TIMEOUT_MS),
      withTimeout(client.messages.create({ model: MODEL, max_tokens: 1024, messages: [{ role: 'user', content: buildPatientPrompt(body, 'ar') }] }), TIMEOUT_MS),
    ])

    const extractText = (msg: Anthropic.Message): string => {
      const block = msg.content[0]
      return block.type === 'text' ? block.text : ''
    }

    const response: GenerateReportResponse = {
      reportPhysicianEn: extractText(physicianEnMsg),
      reportPhysicianAr: extractText(physicianArMsg),
      reportPatientEn:   extractText(patientEnMsg),
      reportPatientAr:   extractText(patientArMsg),
    }

    return NextResponse.json(response)
  } catch (err) {
    // Extract only the error message — never dump raw error objects which may contain API details
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[generate-report]', message)
    return NextResponse.json(
      { error: 'Report generation failed. Please try again.' },
      { status: 500 }
    )
  }
}
