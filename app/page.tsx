import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
      <div className="text-center max-w-2xl px-6">
        <h1 className="text-5xl font-bold text-teal-700 mb-4">NutriGrow</h1>
        <p className="text-xl text-gray-600 mb-2">
          Pediatric Nutrition Assessment Platform
        </p>
        <p className="text-gray-500 mb-10">
          AI-powered obesity risk assessment and parent reports for physicians in Saudi Arabia &amp; UAE
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="border border-teal-600 text-teal-600 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  )
}
