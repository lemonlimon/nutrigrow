'use client'

import { useState } from 'react'
import { useOnboarding } from '../context/OnboardingContext'
import WheelPicker from '../components/WheelPicker'

const MONTHS       = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS         = Array.from({ length: 31 }, (_, i) => i + 1)
const YEARS        = Array.from({ length: 88 },  (_, i) => 2011 - i)  // 2011 down to 1924

function buildDateStr(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function calcAge(dateStr: string): number {
  const today    = new Date()
  const birthday = new Date(dateStr)
  return (today.getTime() - birthday.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
}

export default function Step4Birthday({ onNext, onBack: _onBack }: { onNext: () => void; onBack: () => void }) {
  const { data, update } = useOnboarding()

  const [month, setMonth]         = useState<string>('Jan')
  const [day, setDay]             = useState<number>(1)
  const [year, setYear]           = useState<number>(1990)
  const [showAgeModal, setShowAgeModal] = useState(false)

  const handleChange = (newMonth: string, newDay: number, newYear: number) => {
    const monthIdx = MONTHS.indexOf(newMonth) + 1
    const dateStr  = buildDateStr(newYear, monthIdx, newDay)
    const age      = calcAge(dateStr)

    if (age < 13) {
      setShowAgeModal(true)
      return
    }
    update({ date_of_birth: dateStr })
  }

  const handleMonthChange = (val: string | number) => {
    const newMonth = val as string
    setMonth(newMonth)
    handleChange(newMonth, day, year)
  }

  const handleDayChange = (val: string | number) => {
    const newDay = val as number
    setDay(newDay)
    handleChange(month, newDay, year)
  }

  const handleYearChange = (val: string | number) => {
    const newYear = val as number
    setYear(newYear)
    handleChange(month, day, newYear)
  }

  const canContinue = data.date_of_birth !== null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      padding: '0 20px',
      fontFamily: 'var(--font-dm-sans)',
    }}>
      <h1 style={{
        fontSize: 26,
        fontWeight: 700,
        color: '#1A1A1A',
        marginBottom: 8,
        fontFamily: 'var(--font-dm-sans)',
      }}>
        When were you born?
      </h1>
      <p style={{ fontSize: 15, color: '#6B6B6B', marginBottom: 40, marginTop: 0 }}>
        This will be used to calibrate your custom plan.
      </p>

      {/* Three-column picker */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
      }}>
        <WheelPicker
          items={MONTHS}
          value={month}
          onChange={handleMonthChange}
          width={90}
          label="Month"
        />
        <WheelPicker
          items={DAYS}
          value={day}
          onChange={handleDayChange}
          width={60}
          label="Day"
        />
        <WheelPicker
          items={YEARS}
          value={year}
          onChange={handleYearChange}
          width={80}
          label="Year"
        />
      </div>

      {/* Continue button */}
      <button
        onClick={onNext}
        disabled={!canContinue}
        style={{
          marginTop: 48,
          width: '100%',
          height: 52,
          borderRadius: 100,
          background: canContinue ? '#1A1A1A' : '#C0C0C0',
          color: '#fff',
          border: 'none',
          cursor: canContinue ? 'pointer' : 'default',
          fontSize: 16,
          fontWeight: 600,
          fontFamily: 'var(--font-dm-sans)',
        }}
      >
        Continue
      </button>

      {/* Age restriction modal */}
      {showAgeModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '0 24px',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: 28,
            maxWidth: 280,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}>
            <p style={{
              fontSize: 15,
              color: '#1A1A1A',
              textAlign: 'center',
              margin: 0,
              lineHeight: 1.5,
              fontFamily: 'var(--font-dm-sans)',
            }}>
              We&apos;re sorry! You must be at least 13 years old to use MIZAN.
            </p>
            <button
              onClick={() => setShowAgeModal(false)}
              style={{
                width: '100%',
                height: 48,
                borderRadius: 100,
                background: '#1A1A1A',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 600,
                fontFamily: 'var(--font-dm-sans)',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
