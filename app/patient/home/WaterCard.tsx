'use client'

// Water Tracker card — 8-glass dot grid with optimistic updates
// Loads today's count from /api/water-log, saves on each tap

import { useState, useEffect } from 'react'

const GOAL = 8

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

// Inline water drop icon (SVG, ~18px)
function DropIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="20"
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 1 C8 1 1 9 1 13 C1 16.866 4.134 20 8 20 C11.866 20 15 16.866 15 13 C15 9 8 1 8 1Z"
        fill={filled ? '#fff' : 'none'}
        stroke={filled ? '#1D9E75' : '#CBD5E1'}
        strokeWidth="1.5"
      />
    </svg>
  )
}

interface WaterCardProps {
  patientId: string
  isAr:      boolean
}

export default function WaterCard({ patientId, isAr }: WaterCardProps) {
  const [glasses,  setGlasses]  = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  const date = todayISO()

  // Load today's count on mount
  useEffect(() => {
    const fetchWater = async () => {
      try {
        const res  = await fetch(`/api/water-log?patientId=${patientId}&date=${date}`)
        const json = await res.json()
        if (json.success) setGlasses(json.data.glasses)
      } catch {
        // fail silently — start at 0
      } finally {
        setLoading(false)
      }
    }
    fetchWater()
  }, [patientId, date])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    if (saving || glasses >= GOAL) return

    // Optimistic update
    const next = glasses + 1
    setGlasses(next)
    setSaving(true)

    try {
      const res  = await fetch('/api/water-log', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ patientId, date, glasses: next }),
      })
      const json = await res.json()
      if (!json.success) {
        // Roll back on failure
        setGlasses(glasses)
      }
    } catch {
      // Roll back on network error
      setGlasses(glasses)
    } finally {
      setSaving(false)
    }
  }

  const remaining = GOAL - glasses
  const goalMet   = glasses >= GOAL

  return (
    <div
      className="bg-white rounded-card border border-gray-100 shadow-sm"
      style={{ padding: '20px 24px' }}
    >
      {/* Header */}
      <p
        className="font-dm-sans uppercase"
        style={{ fontSize: 11, color: '#888', letterSpacing: '0.08em', marginBottom: 14 }}
      >
        {isAr ? 'ماء اليوم' : 'Water today'}
      </p>

      {loading ? (
        <div style={{ height: 36 }} />
      ) : (
        <>
          {/* 8-dot grid */}
          <div
            style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap:                 8,
              marginBottom:        16,
            }}
          >
            {Array.from({ length: GOAL }).map((_, i) => {
              const filled = i < glasses
              return (
                <div
                  key={i}
                  style={{
                    width:        36,
                    height:       36,
                    borderRadius: '50%',
                    background:   filled ? '#1D9E75' : '#F1F5F9',
                    border:       filled ? 'none' : '1.5px solid #CBD5E1',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    transition:   'background 200ms, border 200ms',
                  }}
                >
                  <DropIcon filled={filled} />
                </div>
              )
            })}
          </div>

          {/* CTA button */}
          {goalMet ? (
            <div
              className="font-dm-sans"
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          6,
                fontSize:     13,
                color:        '#1D9E75',
                fontWeight:   500,
              }}
            >
              <span>✓</span>
              <span>{isAr ? 'أحسنت! وصلت لهدفك اليوم.' : 'Goal reached — well done.'}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving}
              className="font-dm-sans"
              style={{
                display:        'inline-flex',
                alignItems:     'center',
                gap:            6,
                fontSize:       13,
                fontWeight:     500,
                color:          '#0D5C45',
                background:     '#E8F5F0',
                border:         'none',
                borderRadius:   20,
                padding:        '8px 16px',
                cursor:         saving ? 'not-allowed' : 'pointer',
                opacity:        saving ? 0.7 : 1,
                transition:     'opacity 150ms',
              }}
            >
              <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
              <span>
                {isAr
                  ? `أضف كوبًا · ${remaining} متبقٍ`
                  : `Add a glass · ${remaining} to go`}
              </span>
            </button>
          )}
        </>
      )}
    </div>
  )
}
