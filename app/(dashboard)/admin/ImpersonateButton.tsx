'use client'

import { useState }    from 'react'
import { useRouter }   from 'next/navigation'

export function ImpersonateButton({ patientId }: { patientId: string }) {
  const router        = useRouter()
  const [busy, setBusy] = useState(false)

  const handleClick = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/impersonate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ patientId }),
      })
      if (res.ok) {
        router.push('/patient/home')
      } else {
        setBusy(false)
      }
    } catch {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="font-dm-sans"
      style={{
        background:   '#0D5C45',
        color:        '#fff',
        border:       'none',
        borderRadius: 8,
        padding:      '6px 14px',
        fontSize:     12,
        fontWeight:   600,
        cursor:       busy ? 'wait' : 'pointer',
        opacity:      busy ? 0.6 : 1,
        whiteSpace:   'nowrap',
        flexShrink:   0,
      }}
    >
      {busy ? 'Loading…' : 'View as patient →'}
    </button>
  )
}
