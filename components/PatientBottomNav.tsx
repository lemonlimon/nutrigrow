'use client'

import Link             from 'next/link'
import { usePathname } from 'next/navigation'

function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 8L9 2l7 6v8a1 1 0 01-1 1h-4v-4H6v4H3a1 1 0 01-1-1V8z" />
    </svg>
  )
}

function IconBarChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2"   y="10" width="3.5" height="6" rx="0.75" />
      <rect x="7.5" y="6"  width="3.5" height="10" rx="0.75" />
      <rect x="13"  y="2"  width="3.5" height="14" rx="0.75" />
    </svg>
  )
}

const NAV_ITEMS = [
  {
    href:  '/patient/home',
    label: 'Home',
    Icon:  IconHome,
    match: (p: string) => p.startsWith('/patient/home'),
  },
  {
    href:  '/patient/progress',
    label: 'Progress',
    Icon:  IconBarChart,
    match: (p: string) => p.startsWith('/patient/progress'),
  },
] as const

export function PatientBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        height:     64,
        background: '#fff',
        borderTop:  '1px solid #EBEBEB',
        display:    'flex',
        alignItems: 'center',
      }}
      aria-label="Patient navigation"
    >
      {NAV_ITEMS.map(({ href, label, Icon, match }) => {
        const active = match(pathname)
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
            style={{ color: active ? '#0D5C45' : '#999' }}
          >
            <Icon />
            <span className="font-dm-sans" style={{ fontSize: 11 }}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
