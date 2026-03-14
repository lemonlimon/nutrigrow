'use client'

import Link        from 'next/link'
import { usePathname } from 'next/navigation'

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2"  y="2"  width="6" height="6" rx="1" />
      <rect x="10" y="2"  width="6" height="6" rx="1" />
      <rect x="2"  y="10" width="6" height="6" rx="1" />
      <rect x="10" y="10" width="6" height="6" rx="1" />
    </svg>
  )
}

function IconPerson() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="6" r="3" />
      <path d="M3 15.5c0-3.314 2.686-5.5 6-5.5s6 2.186 6 5.5" />
    </svg>
  )
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconGrid,   match: (p: string) => p === '/dashboard' },
  { href: '/patients',  label: 'Patients',  Icon: IconPerson, match: (p: string) => p.startsWith('/patients') },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-16
                 bg-white border-t border-[#e5e5e5]
                 flex items-center
                 md:hidden
                 z-50"
      aria-label="Mobile navigation"
    >
      {navItems.map(({ href, label, Icon, match }) => {
        const active = match(pathname)
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1 transition"
            style={{ color: active ? '#0D5C45' : '#9ca3af' }}
          >
            <Icon />
            <span className="font-dm-sans" style={{ fontSize: 11 }}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
