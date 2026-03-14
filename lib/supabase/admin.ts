import { createClient } from '@supabase/supabase-js'

// ── Supabase Admin Client ──────────────────────────────────────────────────────
// Uses the service_role key — bypasses Row Level Security completely.
// SERVER-SIDE ONLY. Never import this in client components or expose the key.
//
// Only used when ALLOW_DEV_BYPASS=true in .env.local (dev testing without auth).
// The service_role key is never prefixed NEXT_PUBLIC_ so it cannot leak to the browser.
// ─────────────────────────────────────────────────────────────────────────────

export function createAdminClient() {
  const url            = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      '[admin] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'Add it to .env.local (Supabase Dashboard → Project Settings → API → service_role).'
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  })
}
