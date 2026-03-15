// Server component — reads token from URL and passes to client controller.
// /onboarding           → MODE B (direct)
// /onboarding?token=xxx → MODE A (clinic-invited)

import OnboardingClient from './OnboardingClient'

interface Props {
  searchParams: { token?: string }
}

export default function OnboardingPage({ searchParams }: Props) {
  const token = searchParams.token ?? null
  return <OnboardingClient token={token} />
}
