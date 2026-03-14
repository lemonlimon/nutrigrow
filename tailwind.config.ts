import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── MIZAN Brand Colors ──────────────────────────────────────────────────
      colors: {
        canvas: '#FAFAF8',
        brand: {
          dark:  '#0D5C45',   // active states, submit button, selected UI
          mid:   '#1D9E75',   // secondary accents
          light: '#E8F5F0',   // backgrounds, hover tints
        },
      },

      // ── Font Families ────────────────────────────────────────────────────────
      fontFamily: {
        playfair:  ['var(--font-playfair)', 'Georgia', 'serif'],
        'dm-sans': ['var(--font-dm-sans)',  'system-ui', 'sans-serif'],
        tajawal:   ['var(--font-tajawal)',  'system-ui', 'sans-serif'],
      },

      // ── Border Radius ────────────────────────────────────────────────────────
      borderRadius: {
        card: '16px',   // cards, modals
        btn:  '12px',   // all buttons and inputs
      },
    },
  },
  plugins: [],
}

export default config
