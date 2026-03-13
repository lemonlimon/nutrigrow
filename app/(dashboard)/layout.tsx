import Link from 'next/link'

const navItems = [
  { href: '/dashboard', label: '🏠 Dashboard' },
  { href: '/patients', label: '👤 Patients' },
  { href: '/assessments', label: '📋 Assessments' },
  { href: '/reports', label: '📄 Reports' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-teal-700">MIZAN Health</h1>
          <p className="text-xs text-gray-400 mt-1">Clinical Obesity Management</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-4 py-2.5 rounded-lg text-gray-600 hover:bg-teal-50 hover:text-teal-700 transition font-medium"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:text-red-500 transition">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
