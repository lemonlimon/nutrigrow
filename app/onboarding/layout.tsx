// Minimal layout for /onboarding — no dashboard nav, no header.
// Just passes children through and sets base meta.

import { ReactNode } from 'react'

export const metadata = {
  title:       'Get started — MIZAN',
  description: 'Set up your personalised weight-management plan.',
}

export default function OnboardingRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
