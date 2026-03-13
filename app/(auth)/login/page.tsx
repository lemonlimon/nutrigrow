import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-teal-700">MIZAN Health</h1>
          <p className="text-xs tracking-widest text-teal-400 uppercase mb-1">ميزان</p>
          <p className="text-gray-500 mt-1">Physician sign in</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
