'use client'

import { useState } from 'react'

interface Clinic { id: string; name: string }

export function AdminClinicSwitcher({
  clinics,
  currentClinicId,
}: {
  clinics:         Clinic[]
  currentClinicId: string
}) {
  const [open, setOpen] = useState(false)
  const current = clinics.find(c => c.id === currentClinicId)

  return (
    // Negative margin escapes the layout's 24px top / 16px side padding → full-width strip
    <div style={{
      background:    '#FFF8EB',
      borderBottom:  '1px solid #F5A623',
      padding:       '10px 20px',
      margin:        '-24px -16px 24px',
      display:       'flex',
      alignItems:    'center',
      justifyContent:'space-between',
    }}>

      {/* Left: admin label */}
      <span
        className="font-dm-sans uppercase"
        style={{ fontSize: 10, color: '#F5A623', letterSpacing: '0.1em', fontWeight: 600 }}
      >
        👁 Admin View
      </span>

      {/* Right: clinic selector */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="font-dm-sans"
          style={{
            fontSize:   13,
            fontWeight: 600,
            color:      '#0D5C45',
            background: 'transparent',
            border:     'none',
            cursor:     'pointer',
            display:    'flex',
            alignItems: 'center',
            gap:        4,
            padding:    0,
          }}
        >
          {current?.name ?? 'Select clinic'}
          <span style={{ fontSize: 10, marginLeft: 2 }}>▾</span>
        </button>

        {open && (
          <>
            {/* Click-away backdrop */}
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 49 }}
              onClick={() => setOpen(false)}
            />
            {/* Dropdown list */}
            <div style={{
              position:     'absolute',
              top:          'calc(100% + 6px)',
              right:        0,
              zIndex:       50,
              background:   '#fff',
              borderRadius: 12,
              boxShadow:    '0 4px 20px rgba(0,0,0,0.13)',
              padding:      6,
              minWidth:     280,
            }}>
              {clinics.map(c => (
                <a
                  key={c.id}
                  href={`/dashboard?clinic=${c.id}`}
                  className="font-dm-sans"
                  onClick={() => setOpen(false)}
                  style={{
                    display:        'block',
                    padding:        '10px 14px',
                    borderRadius:   8,
                    fontSize:       14,
                    textDecoration: 'none',
                    color:          c.id === currentClinicId ? '#0D5C45' : '#1A1A1A',
                    fontWeight:     c.id === currentClinicId ? 700       : 400,
                    background:     c.id === currentClinicId ? '#E8F5F0' : 'transparent',
                  }}
                >
                  {c.name}
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
