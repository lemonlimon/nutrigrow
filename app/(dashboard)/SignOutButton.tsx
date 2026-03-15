'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function SignOutButton() {
  const [initial,  setInitial]  = useState<string>('')
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setInitial(user.email[0].toUpperCase())
    })
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setShowMenu(m => !m)}
        style={{
          width:          32,
          height:         32,
          borderRadius:   '50%',
          background:     '#E8F5F0',
          color:          '#0D5C45',
          fontSize:       14,
          fontWeight:     700,
          border:         'none',
          cursor:         'pointer',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontFamily:     'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
        }}
      >
        {initial || '·'}
      </button>

      {showMenu && (
        <>
          {/* Click-away backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setShowMenu(false)}
          />
          <div
            style={{
              position:     'absolute',
              top:          'calc(100% + 8px)',
              right:        0,
              background:   'white',
              borderRadius: 12,
              boxShadow:    '0 4px 20px rgba(0,0,0,0.12)',
              padding:      '8px 0',
              zIndex:       100,
              minWidth:     160,
            }}
          >
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                display:    'block',
                width:      '100%',
                padding:    '12px 16px',
                textAlign:  'left',
                background: 'none',
                border:     'none',
                fontSize:   14,
                color:      '#E8623A',
                fontFamily: 'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
                cursor:     'pointer',
              }}
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
