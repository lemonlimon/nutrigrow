import Link from 'next/link'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Clean anon client — no cookie auth, no session headers.
// The "Public invite token lookup" RLS policy expects a plain anon key request.
function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface PatientRow {
  id:                     string
  first_name:             string
  preferred_language:     'en' | 'ar'
  invite_status:          string
  invite_token_expires_at: string
}

// ── UUID format guard ──────────────────────────────────────────────────────────
// Prevent malformed tokens from reaching Supabase as a query value
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Shared layout wrapper ──────────────────────────────────────────────────────
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-start px-4 py-16">
      <div className="w-full max-w-[480px] space-y-6">
        {/* Wordmark */}
        <p className="text-center font-playfair text-xl text-brand-dark tracking-wide">
          MIZAN
        </p>
        {children}
      </div>
    </div>
  )
}

// ── State 1: Expired / not found ───────────────────────────────────────────────
// Shown when: token is missing, invalid format, not in DB, or past expiry.
// Both languages shown — we don't know the patient's preference at this point.
function ExpiredView() {
  return (
    <PageShell>
      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-8 space-y-5">

        {/* English */}
        <div className="space-y-2">
          <h1 className="font-playfair text-xl text-gray-900 leading-snug">
            Invitation link expired
          </h1>
          <p className="text-sm text-gray-500 font-dm-sans leading-relaxed">
            This invitation link has expired. Please ask your clinic to send a new one.
          </p>
        </div>

        <hr className="border-gray-100" />

        {/* Arabic */}
        <div dir="rtl" lang="ar" className="space-y-2">
          <h2 className="font-tajawal text-xl text-gray-900 leading-snug">
            انتهت صلاحية رابط الدعوة
          </h2>
          <p className="font-tajawal text-sm text-gray-500 leading-relaxed">
            انتهت صلاحية رابط الدعوة. يرجى طلب رابط جديد من العيادة.
          </p>
        </div>

      </div>
    </PageShell>
  )
}

// ── State 2: Already active ────────────────────────────────────────────────────
// Shown when: invite_status === 'active' — patient already created their account.
function AlreadyActiveView({ language }: { language: 'en' | 'ar' }) {
  const isAr = language === 'ar'

  return (
    <PageShell>
      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-8 space-y-6">

        {isAr ? (
          <div dir="rtl" lang="ar" className="space-y-2">
            <h1 className="font-tajawal text-xl text-gray-900">
              لديك حساب بالفعل
            </h1>
            <p className="font-tajawal text-sm text-gray-500 leading-relaxed">
              يبدو أنك سجّلت حسابك من قبل. يرجى تسجيل الدخول للمتابعة.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <h1 className="font-playfair text-xl text-gray-900">
              You already have an account
            </h1>
            <p className="text-sm text-gray-500 font-dm-sans leading-relaxed">
              It looks like you have already registered. Please log in to continue.
            </p>
          </div>
        )}

        <Link
          href="/login"
          className="block w-full text-center py-4 rounded-btn bg-brand-dark text-white
                     font-medium text-sm font-dm-sans hover:opacity-90 transition-opacity"
        >
          {isAr
            ? <span dir="rtl" lang="ar" className="font-tajawal">تسجيل الدخول</span>
            : 'Log in'
          }
        </Link>

      </div>
    </PageShell>
  )
}

// ── State 3: Valid invite — welcome screen ─────────────────────────────────────
function WelcomeView({
  patient,
  token,
}: {
  patient: PatientRow
  token:   string
}) {
  const isAr = patient.preferred_language === 'ar'

  return (
    <PageShell>
      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-8 space-y-6">

        {isAr ? (
          // Arabic layout — full card in RTL
          <div dir="rtl" lang="ar" className="space-y-6">

            <div className="space-y-3">
              <h1 className="font-tajawal text-2xl text-gray-900 leading-snug">
                مرحباً، {patient.first_name}.
              </h1>
              <p className="font-tajawal text-sm text-gray-500 leading-relaxed">
                ميزان برنامجك الصحي الشخصي — متابعة أسبوعية للتقدم، ورؤى غذائية،
                وإرشادات مبنية حول رحلتك الخاصة.
              </p>
            </div>

            <Link
              href={`/join/signup?token=${token}`}
              className="block w-full text-center py-4 rounded-btn bg-brand-dark text-white
                         font-tajawal font-medium text-sm hover:opacity-90 transition-opacity"
            >
              إنشاء حسابك
            </Link>

          </div>
        ) : (
          // English layout
          <div className="space-y-6">

            <div className="space-y-3">
              <h1 className="font-playfair text-2xl text-gray-900 leading-snug">
                Welcome, {patient.first_name}.
              </h1>
              <p className="text-sm text-gray-500 font-dm-sans leading-relaxed">
                MIZAN is your personal health program — weekly progress tracking,
                meal insights, and guidance built around your journey.
              </p>
            </div>

            <Link
              href={`/join/signup?token=${token}`}
              className="block w-full text-center py-4 rounded-btn bg-brand-dark text-white
                         font-dm-sans font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Create your account
            </Link>

          </div>
        )}

      </div>
    </PageShell>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function JoinPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const token = searchParams.token

  // No token or invalid UUID format — show expired screen immediately
  if (!token || !UUID_PATTERN.test(token)) {
    return <ExpiredView />
  }

  // Query — clean anon client (no cookie auth headers).
  // RLS filters out expired tokens automatically; no result = expired or not found.
  // Only select the fields needed for this page — no biometrics returned.
  const supabase = createAnonClient()

  const { data: patient, error } = await supabase
    .from('patients')
    .select('id, first_name, preferred_language, invite_status, invite_token_expires_at')
    .eq('invite_token', token)
    .single<PatientRow>()

  // No row returned (expired, not found) or unexpected error → same user experience
  if (error || !patient) {
    return <ExpiredView />
  }

  // Token valid but patient already signed up
  if (patient.invite_status === 'active') {
    return <AlreadyActiveView language={patient.preferred_language} />
  }

  // Valid invite, pending activation
  return <WelcomeView patient={patient} token={token} />
}
