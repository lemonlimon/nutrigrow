'use client'

/**
 * OnboardingClient — master step controller.
 *
 * On mount:
 *   • If token present → validate via API → set mode='invited' or show InvalidToken
 *   • If no token      → check Supabase session → set mode='direct', skip auth if authed
 *
 * Renders OnboardingLayout (chrome) + AnimatedStep (slide) around each step component.
 */

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient }              from '@supabase/ssr'

import { OnboardingProvider, useOnboarding } from './context/OnboardingContext'
import OnboardingLayout                       from './components/OnboardingLayout'
import AnimatedStep                           from './components/AnimatedStep'
import InvalidToken                           from './components/InvalidToken'

import Step0Auth          from './steps/Step0Auth'
import Step1Goal          from './steps/Step1Goal'
import Step2Gender        from './steps/Step2Gender'
import Step3HeightWeight  from './steps/Step3HeightWeight'
import Step4Birthday      from './steps/Step4Birthday'
import Step5WorkoutFreq   from './steps/Step5WorkoutFreq'
import Step6DesiredWeight from './steps/Step6DesiredWeight'
import Step7Validation    from './steps/Step7Validation'
import Step8WeightSpeed   from './steps/Step8WeightSpeed'
import Step9Barriers      from './steps/Step9Barriers'
import Step10DietType     from './steps/Step10DietType'
import Step11WellnessGoals from './steps/Step11WellnessGoals'
import Step12Chart        from './steps/Step12Chart'
import Step13Rollover     from './steps/Step13Rollover'
import Step14Exercise     from './steps/Step14Exercise'
import Step15Privacy      from './steps/Step15Privacy'
import Step16Referral     from './steps/Step16Referral'
import StepFinalLoading   from './steps/StepFinalLoading'

// ── Step definitions ───────────────────────────────────────────────────────

type StepId =
  | 'auth'
  | 'goal' | 'gender' | 'height_weight' | 'birthday' | 'workout'
  | 'desired_weight' | 'validation' | 'weight_speed' | 'barriers'
  | 'diet' | 'wellness' | 'chart' | 'rollover' | 'exercise'
  | 'privacy' | 'referral' | 'final'

// Steps that count toward the progress bar (16 total)
const CONTENT_STEPS: StepId[] = [
  'goal', 'gender', 'height_weight', 'birthday', 'workout',
  'desired_weight', 'validation', 'weight_speed', 'barriers',
  'diet', 'wellness', 'chart', 'rollover', 'exercise',
  'privacy', 'referral',
]

interface StepCfg {
  showBack:     boolean
  showContinue: boolean
}

const STEP_CFG: Record<StepId, StepCfg> = {
  auth:          { showBack: false, showContinue: false },
  goal:          { showBack: true,  showContinue: false }, // auto-advance
  gender:        { showBack: true,  showContinue: false }, // auto-advance
  height_weight: { showBack: true,  showContinue: true  },
  birthday:      { showBack: true,  showContinue: true  },
  workout:       { showBack: true,  showContinue: false }, // auto-advance
  desired_weight:{ showBack: true,  showContinue: true  },
  validation:    { showBack: false, showContinue: true  },
  weight_speed:  { showBack: true,  showContinue: true  },
  barriers:      { showBack: true,  showContinue: true  },
  diet:          { showBack: true,  showContinue: false }, // auto-advance
  wellness:      { showBack: true,  showContinue: true  },
  chart:         { showBack: false, showContinue: true  },
  rollover:      { showBack: true,  showContinue: false }, // auto-advance (buttons)
  exercise:      { showBack: true,  showContinue: false }, // auto-advance (buttons)
  privacy:       { showBack: false, showContinue: true  },
  referral:      { showBack: true,  showContinue: true  },
  final:         { showBack: false, showContinue: false },
}

// ── canContinue logic per step ─────────────────────────────────────────────

function useCanContinue(step: StepId): boolean {
  const { data } = useOnboarding()
  switch (step) {
    case 'birthday':       return data.date_of_birth !== null
    case 'desired_weight': return data.target_weight !== null
    case 'weight_speed':   return data.weight_loss_speed !== null
    case 'barriers':       return data.barriers.length > 0
    case 'wellness':       return data.wellness_goals.length > 0
    case 'referral':       return data.referral_source !== null
    default:               return true
  }
}

// ── Inner controller (must be inside OnboardingProvider) ──────────────────

function Controller({ token }: { token: string | null }) {
  const { update } = useOnboarding()

  // Status: 'loading' | 'invalid_token' | 'ready'
  const [status,    setStatus]    = useState<'loading' | 'invalid_token' | 'ready'>('loading')
  const [steps,     setSteps]     = useState<StepId[]>([])
  const [idx,       setIdx]       = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)

  // ── Mount: detect mode & build step list ──────────────────────────────
  useEffect(() => {
    void (async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      if (token) {
        // ── MODE A: clinic-invited ──────────────────────────────────────
        const res = await fetch(`/api/onboarding/validate-token?token=${encodeURIComponent(token)}`)
        const json = await res.json() as {
          valid: boolean
          email?: string
          clinicId?: string
          patientId?: string
        }
        if (!json.valid) { setStatus('invalid_token'); return }

        update({
          mode:           'invited',
          inviteToken:    token,
          prefilledEmail: json.email    ?? null,
          clinicId:       json.clinicId ?? null,
          patientId:      json.patientId ?? null,
        })
        setSteps(['auth', ...CONTENT_STEPS, 'final'])
        setStatus('ready')
      } else {
        // ── MODE B: direct-to-consumer ──────────────────────────────────
        update({ mode: 'direct' })
        const { data: { session } } = await supabase.auth.getSession()
        const authed = session !== null
        setSteps(authed ? [...CONTENT_STEPS, 'final'] : ['auth', ...CONTENT_STEPS, 'final'])
        setStatus('ready')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // ── Navigation ────────────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    setDirection(1)
    setIdx(prev => Math.min(prev + 1, steps.length - 1))
  }, [steps.length])

  const handleBack = useCallback(() => {
    setDirection(-1)
    setIdx(prev => Math.max(prev - 1, 0))
  }, [])

  // ── Current step ──────────────────────────────────────────────────────
  const currentStep  = steps[idx] ?? 'goal'
  const cfg          = STEP_CFG[currentStep]
  const contentIdx   = CONTENT_STEPS.indexOf(currentStep)   // -1 if not content
  const progressFrac = contentIdx >= 0
    ? (contentIdx + 1) / CONTENT_STEPS.length
    : undefined

  const showChrome = currentStep !== 'final'
  const isRTL      = false  // TODO: detect from patient preferred_language

  // canContinue is computed per-step in a child component due to hook rules
  const canContinue = useCanContinue(currentStep)

  // ── Render ────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={{
        height:         '100svh',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        background:     '#fff',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '3px solid #F0F0F0',
          borderTopColor: '#1A1A1A',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (status === 'invalid_token') return <InvalidToken />

  const stepProps = { onNext: handleNext, onBack: handleBack }

  const StepMap: Record<StepId, JSX.Element> = {
    auth:          <Step0Auth          {...stepProps} />,
    goal:          <Step1Goal          {...stepProps} />,
    gender:        <Step2Gender        {...stepProps} />,
    height_weight: <Step3HeightWeight  {...stepProps} />,
    birthday:      <Step4Birthday      {...stepProps} />,
    workout:       <Step5WorkoutFreq   {...stepProps} />,
    desired_weight:<Step6DesiredWeight {...stepProps} />,
    validation:    <Step7Validation    {...stepProps} />,
    weight_speed:  <Step8WeightSpeed   {...stepProps} />,
    barriers:      <Step9Barriers      {...stepProps} />,
    diet:          <Step10DietType     {...stepProps} />,
    wellness:      <Step11WellnessGoals{...stepProps} />,
    chart:         <Step12Chart        {...stepProps} />,
    rollover:      <Step13Rollover     {...stepProps} />,
    exercise:      <Step14Exercise     {...stepProps} />,
    privacy:       <Step15Privacy      {...stepProps} />,
    referral:      <Step16Referral     {...stepProps} />,
    final:         <StepFinalLoading   {...stepProps} />,
  }

  return (
    <OnboardingLayout
      showChrome={showChrome}
      progressFrac={progressFrac}
      showBack={cfg.showBack}
      onBack={handleBack}
      isRTL={isRTL}
      showContinue={cfg.showContinue}
      canContinue={canContinue}
      onContinue={handleNext}
    >
      <AnimatedStep stepKey={currentStep} direction={direction} isRTL={isRTL}>
        {StepMap[currentStep]}
      </AnimatedStep>
    </OnboardingLayout>
  )
}

// ── Public export — wraps Controller in the context provider ──────────────

export default function OnboardingClient({ token }: { token: string | null }) {
  return (
    <OnboardingProvider>
      <Controller token={token} />
    </OnboardingProvider>
  )
}
