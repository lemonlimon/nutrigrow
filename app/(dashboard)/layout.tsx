import { DashboardNavPills } from './DashboardNavPills'
import { SignOutButton }     from './SignOutButton'
import AdminBanner           from '@/app/components/AdminBanner'

// ── Layout — mobile-first, no sidebar ────────────────────────────────────────
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Admin impersonation banner (amber, only shown when cookie is set) ── */}
      <AdminBanner />

      {/* ── Sticky header + nav pills ── */}
      <div
        style={{
          position:     'sticky',
          top:          0,
          zIndex:       50,
          background:   '#FAFAF8',
          borderBottom: '1px solid #F0F0F0',
        }}
      >
        {/* Brand row */}
        <div
          style={{
            height:         52,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '0 20px',
          }}
        >
          <span className="font-tajawal" style={{ fontSize: 22, color: '#0D5C45', lineHeight: 1 }}>
            ميزان
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="font-playfair" style={{ fontSize: 16, letterSpacing: '0.12em', color: '#1A1A1A' }}>
              MIZAN
            </span>
            <SignOutButton />
          </div>
        </div>

        {/* Nav pills */}
        <DashboardNavPills />
      </div>

      {/* ── Main content — full width mobile, max 800px centered desktop ── */}
      <main
        style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 96px' }}
      >
        {children}
      </main>

    </div>
  )
}
