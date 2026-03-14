// CHANGE 1: heading → #1a1a1a, stat numbers → #1a1a1a, labels → #666
import { createAdminClient } from '@/lib/supabase/admin'

const CLINIC_ID = '00000000-0000-0000-0000-000000000001'

export default async function DashboardPage() {
  const admin = createAdminClient()

  const { count: totalPatients } = await admin
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', CLINIC_ID)

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count: enrolledThisMonth } = await admin
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', CLINIC_ID)
    .gte('enrolled_at', startOfMonth.toISOString())

  const stats = [
    { label: 'Total Patients',      value: String(totalPatients    ?? 0) },
    { label: 'Enrolled This Month', value: String(enrolledThisMonth ?? 0) },
  ]

  return (
    <div className="max-w-3xl">

      {/* Heading — CHANGE 1: near-black */}
      <h2
        className="font-playfair font-bold mb-8"
        style={{ fontSize: 28, color: '#1a1a1a' }}
      >
        Dashboard
      </h2>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-card shadow-sm border border-gray-100 px-6 py-7"
          >
            <p
              className="font-dm-sans uppercase mb-2"
              style={{ fontSize: 11, color: '#888', letterSpacing: '0.06em' }}
            >
              {s.label}
            </p>
            {/* CHANGE 1: stat number in near-black not green */}
            <p
              className="font-playfair font-bold"
              style={{ fontSize: 48, color: '#1a1a1a', lineHeight: 1 }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
        <h3
          className="font-dm-sans font-semibold mb-4 uppercase"
          style={{ fontSize: 11, color: '#888', letterSpacing: '0.06em' }}
        >
          Quick Actions
        </h3>
        <div className="flex gap-3 flex-wrap">
          <a
            href="/patients"
            className="bg-brand-dark text-white px-5 py-2.5 rounded-btn
                       text-sm font-dm-sans font-medium hover:opacity-90 transition"
          >
            View Patients
          </a>
          <a
            href="/enroll"
            className="border border-brand-dark text-brand-dark bg-transparent
                       px-5 py-2.5 rounded-btn text-sm font-dm-sans font-medium
                       hover:bg-brand-light transition"
          >
            + Enroll New Patient
          </a>
        </div>
      </div>
    </div>
  )
}
