import { PatientBottomNav } from '@/components/PatientBottomNav'

// Wraps all /patient/* pages with the shared bottom navigation bar.
// Pages are responsible for their own bottom padding (≥ 80px) so content
// is never hidden behind the 64px fixed nav.
export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PatientBottomNav />
    </>
  )
}
