'use client'

/**
 * OnboardingLayout — the persistent chrome around every step.
 *   • Back arrow (top-left) — flips to → in RTL
 *   • 3px progress bar (filled fraction of 16 content steps)
 *   • Sticky "Continue" pill at bottom
 *
 * Steps that hide the chrome (auth step, final step) should pass
 * showChrome={false}.
 */

import { ReactNode } from 'react'

interface OnboardingLayoutProps {
  children:       ReactNode
  // progress
  showChrome?:    boolean   // default true
  progressFrac?:  number    // 0–1; undefined = no bar
  // back
  showBack?:      boolean
  onBack?:        () => void
  isRTL?:         boolean
  // continue
  showContinue?:  boolean
  continueLabel?: string
  canContinue?:   boolean
  onContinue?:    () => void
}

export default function OnboardingLayout({
  children,
  showChrome   = true,
  progressFrac,
  showBack     = true,
  onBack,
  isRTL        = false,
  showContinue = true,
  continueLabel= 'Continue',
  canContinue  = true,
  onContinue,
}: OnboardingLayoutProps) {
  const active = canContinue
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      height:         '100svh',
      background:     '#fff',
      overflow:       'hidden',
      direction:      isRTL ? 'rtl' : 'ltr',
    }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      {showChrome && (
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          {/* Back arrow */}
          {showBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              style={{
                width:          36,
                height:         36,
                borderRadius:   '50%',
                background:     '#F0F0F0',
                border:         'none',
                cursor:         'pointer',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                marginBottom:   12,
                flexShrink:     0,
              }}
            >
              <svg
                width={16}
                height={16}
                viewBox="0 0 16 16"
                fill="none"
                style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}
              >
                <path
                  d="M10 12L6 8l4-4"
                  stroke="#1A1A1A"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          {/* Progress bar */}
          {progressFrac !== undefined && (
            <div style={{
              height:       3,
              background:   '#F0F0F0',
              borderRadius: 2,
              overflow:     'hidden',
              marginBottom: 4,
            }}>
              <div style={{
                height:       '100%',
                width:        `${Math.min(1, progressFrac) * 100}%`,
                background:   '#1A1A1A',
                borderRadius: 2,
                transition:   'width 0.35s ease',
                // RTL: fill from right
                ...(isRTL
                  ? { marginLeft: 'auto', marginRight: 0 }
                  : {}),
              }} />
            </div>
          )}
        </div>
      )}

      {/* ── Content area (slides live here) ──────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {children}
      </div>

      {/* ── Continue pill ─────────────────────────────────────────── */}
      {showChrome && showContinue && (
        <div style={{
          padding:    '12px 20px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          flexShrink: 0,
        }}>
          <button
            onClick={active ? onContinue : undefined}
            disabled={!active}
            style={{
              width:        '100%',
              height:       52,
              borderRadius: 100,
              border:       'none',
              background:   active ? '#1A1A1A' : '#D1D1D1',
              color:        active ? '#fff'    : '#9A9A9A',
              fontSize:     16,
              fontWeight:   600,
              fontFamily:   'var(--font-dm-sans)',
              cursor:       active ? 'pointer' : 'default',
              transition:   'background 0.2s',
            }}
          >
            {continueLabel}
          </button>
        </div>
      )}
    </div>
  )
}
