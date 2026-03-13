import Link from 'next/link'

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-teal-700">NutriGrow</h1>
          <p className="text-gray-500 mt-1">Create your physician account</p>
        </div>
        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-teal-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
