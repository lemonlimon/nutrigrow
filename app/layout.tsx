import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans, Tajawal } from 'next/font/google'
import './globals.css'

// ── MIZAN Design System Fonts ─────────────────────────────────────────────────
// Playfair Display — headings, display text
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

// DM Sans — labels, body, inputs
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

// Tajawal — Arabic text only; never applied globally
const tajawal = Tajawal({
  subsets: ['arabic'],
  variable: '--font-tajawal',
  weight: ['400', '500', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MIZAN Health',
  description: 'Clinic enrollment portal',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${tajawal.variable}`}>
      <body className="antialiased bg-canvas font-dm-sans">
        {children}
      </body>
    </html>
  )
}
