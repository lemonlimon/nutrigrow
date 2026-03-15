'use client'

import { useOnboarding } from '../context/OnboardingContext'
import WeightTransitionChart from '../components/WeightTransitionChart'

interface Props {
  onNext: () => void
  onBack: () => void
}

export default function Step12Chart({ onNext: _onNext, onBack: _onBack }: Props) {
  const { data: _data } = useOnboarding()

  return (
    <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-dm-sans)' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A', marginBottom: 24 }}>
        You have great potential to crush your goals!
      </h1>

      <p style={{ fontSize: 14, color: '#9A9A9A', marginBottom: 8, margin: '0 0 8px 0' }}>
        Your weight transition
      </p>

      <WeightTransitionChart />

      <p style={{
        fontSize:    15,
        color:       '#6B6B6B',
        marginTop:   16,
        lineHeight:  1.6,
      }}>
        Based on MIZAN&apos;s data, weight loss is usually delayed at first, but after 7 days,
        you can burn fat at full speed!
      </p>
    </div>
  )
}
