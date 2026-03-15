'use client'

import Link           from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/patients',  label: 'Patients'  },
]

export function DashboardNavPills() {
  const pathname = usePathname()

  return (
    <div
      style={{
        display:        'flex',
        gap:            8,
        padding:        '8px 20px 10px',
        background:     '#FAFAF8',
      }}
    >
      {NAV.map(({ href, label }) => {
        // Active if pathname starts with the href
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className="font-dm-sans"
            style={{
              fontSize:       13,
              fontWeight:     600,
              padding:        '5px 16px',
              borderRadius:   20,
              background:     isActive ? '#0D5C45' : 'transparent',
              color:          isActive ? '#fff' : '#999',
              textDecoration: 'none',
              transition:     'background 150ms ease, color 150ms ease',
            }}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
