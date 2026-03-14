'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default function PatientLoginPage() {
  const router = useRouter()

  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { error: authError } = await supabase().auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Incorrect email or password. Please try again.')
      setSubmitting(false)
      return
    }

    router.replace('/patient/home')
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-[440px] space-y-6">

        <p className="text-center font-playfair text-xl text-brand-dark tracking-wide">
          MIZAN
        </p>

        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-8 space-y-6">

          <div className="space-y-1">
            <h1 className="font-playfair text-2xl text-gray-900">Welcome back</h1>
            <p className="font-dm-sans text-sm text-gray-500">Log in to your MIZAN account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-2">
              <label className="block font-dm-sans text-sm font-semibold text-gray-700">
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-btn font-dm-sans
                           text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-brand-mid"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-dm-sans text-sm font-semibold text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 pr-16 border border-gray-200 rounded-btn font-dm-sans
                             text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-brand-mid"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 font-dm-sans text-xs
                             font-semibold text-brand-mid bg-transparent border-none cursor-pointer p-0"
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <p className="font-dm-sans text-sm text-red-700 bg-red-50 px-3.5 py-2.5 rounded-btn">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-4 rounded-btn font-dm-sans text-base font-semibold text-white
                          transition-opacity ${submitting
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-brand-dark hover:opacity-90 cursor-pointer'}`}
            >
              {submitting ? 'Logging in…' : 'Log in'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}
