// CHANGE 4: emoji icons replaced with clean inline SVG
// CHANGE 6: confirmed — only Dashboard and Patients remain
import Link from 'next/link'

// ── SVG Icons ─────────────────────────────────────────────────────────────────
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
  { href: '/dashboard', label: 'Dashboard', Icon: IconGrid   },
  { href: '/patients',  label: 'Patients',  Icon: IconPerson },
]

// ── Layout ────────────────────────────────────────────────────────────────────
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex bg-canvas">

      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col">

        {/* Brand */}
        <div className="px-6 py-7 border-b border-gray-100">
          <h1 className="text-xl font-playfair font-bold text-brand-dark tracking-tight">
            MIZAN Health
          </h1>
          <p className="text-[11px] text-gray-400 mt-0.5 font-dm-sans uppercase tracking-widest">
            Clinical Management
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-btn
                         text-[#666] text-sm font-dm-sans font-medium
                         hover:bg-brand-light hover:text-brand-dark transition"
            >
              <Icon />
              {label}
            </Link>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 pb-4 border-t border-gray-100 pt-3">
          <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                             text-gray-400 hover:text-red-500 transition font-dm-sans rounded-btn">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
