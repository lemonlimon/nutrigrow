'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useOnboarding } from '../context/OnboardingContext'

interface Props {
  onNext: () => void
  onBack: () => void
}

const STATUS_MESSAGES = [
  'Calculating your TDEE...',
  'Setting calorie targets...',
  'Personalizing your macros...',
  'Almost ready...',
]

const PROGRESS_DURATION_MS = 3000
const TICK_INTERVAL_MS     = 30
const TICK_INCREMENT       = 100 / (PROGRESS_DURATION_MS / TICK_INTERVAL_MS)
const MESSAGE_INTERVAL_MS  = 750

export default function StepFinalLoading({ onNext: _onNext, onBack: _onBack }: Props) {
  const { data } = useOnboarding()

  const [progress,     setProgress]     = useState(0)
  const [messageIndex, setMessageIndex] = useState(0)
  const [error,        setError]        = useState<string | null>(null)
  const [submitted,    setSubmitted]    = useState(false)

  // Submit to API on mount
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    async function submit() {
      try {
        const { data: { session: _session } } = await supabase.auth.getSession()

        const res = await fetch('/api/onboarding/complete', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode:                  data.mode,
            patientId:             data.patientId,
            clinicId:              data.clinicId,
            inviteToken:           data.inviteToken,
            // Form fields
            gender:                data.gender,
            date_of_birth:         data.date_of_birth,
            unit:                  data.unit,
            height_ft:             data.height_ft,
            height_in:             data.height_in,
            height_cm:             data.height_cm,
            current_weight:        data.current_weight,
            current_weight_unit:   data.current_weight_unit,
            goal_type:             data.goal_type,
            workout_frequency:     data.workout_frequency,
            target_weight:         data.target_weight,
            weight_loss_speed:     data.weight_loss_speed,
            barriers:              data.barriers,
            diet_type:             data.diet_type,
            wellness_goals:        data.wellness_goals,
            rollover_calories:     data.rollover_calories,
            add_exercise_calories: data.add_exercise_calories,
            referral_source:       data.referral_source,
          }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(body.error ?? `Request failed with status ${res.status}`)
        }

        setSubmitted(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    }

    const timer = setTimeout(submit, 100)
    return () => clearTimeout(timer)
  // Only run once on mount — data is captured at that point
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Progress bar animation
  useEffect(() => {
    if (error) return

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(prev + TICK_INCREMENT, 100)
        return next
      })
    }, TICK_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [error])

  // Redirect when progress hits 100 and submission succeeded
  useEffect(() => {
    if (progress >= 100 && submitted) {
      window.location.href = '/patient/home'
    }
  }, [progress, submitted])

  // Rotating status messages
  useEffect(() => {
    if (error) return

    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % STATUS_MESSAGES.length)
    }, MESSAGE_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [error])

  if (error) {
    return (
      <div style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        height:         '100svh',
        padding:        '40px 24px',
        fontFamily:     'var(--font-dm-sans)',
        textAlign:      'center',
      }}>
        <p style={{ fontSize: 16, color: '#FF4444', marginBottom: 8, fontWeight: 600 }}>
          Something went wrong
        </p>
        <p style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 32, lineHeight: 1.6 }}>
          {error}
        </p>
        <button
          onClick={() => {
            setError(null)
            setProgress(0)
            setSubmitted(false)
          }}
          style={{
            height:       52,
            padding:      '0 32px',
            borderRadius: 100,
            border:       'none',
            background:   '#1A1A1A',
            color:        '#fff',
            fontSize:     16,
            fontWeight:   600,
            fontFamily:   'var(--font-dm-sans)',
            cursor:       'pointer',
          }}
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      height:         '100svh',
      padding:        '40px 24px',
      fontFamily:     'var(--font-dm-sans)',
    }}>
      <h1 style={{
        fontSize:     22,
        fontWeight:   700,
        color:        '#1A1A1A',
        marginBottom: 32,
        textAlign:    'center',
      }}>
        Building your personal plan...
      </h1>

      {/* Progress bar */}
      <div style={{
        width:        280,
        height:       6,
        background:   '#F0F0F0',
        borderRadius: 3,
        overflow:     'hidden',
        marginBottom: 20,
      }}>
        <div style={{
          height:       '100%',
          borderRadius: 3,
          background:   '#1A1A1A',
          width:        `${progress}%`,
          transition:   `width ${TICK_INTERVAL_MS}ms linear`,
        }} />
      </div>

      {/* Status message */}
      <p style={{
        fontSize:   15,
        color:      '#6B6B6B',
        textAlign:  'center',
        fontFamily: 'var(--font-dm-sans)',
        minHeight:  24,
      }}>
        {STATUS_MESSAGES[messageIndex]}
      </p>
    </div>
  )
}
