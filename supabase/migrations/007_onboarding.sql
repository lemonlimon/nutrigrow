-- Migration 007: onboarding columns + invite_tokens table
-- Run in Supabase SQL editor before deploying onboarding flow

-- ── New columns on patients ───────────────────────────────────────────────
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS gender             text,
  ADD COLUMN IF NOT EXISTS date_of_birth      date,
  ADD COLUMN IF NOT EXISTS goal_type          text,
  ADD COLUMN IF NOT EXISTS workout_frequency  text,
  ADD COLUMN IF NOT EXISTS target_weight      numeric,
  ADD COLUMN IF NOT EXISTS weight_loss_speed  numeric,
  ADD COLUMN IF NOT EXISTS barriers           jsonb    DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS diet_type          text,
  ADD COLUMN IF NOT EXISTS wellness_goals     jsonb    DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rollover_calories  boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS add_exercise_calories boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_source    text,
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;

-- ── invite_tokens table (new onboarding token system) ────────────────────
CREATE TABLE IF NOT EXISTS invite_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text        UNIQUE NOT NULL,
  patient_id  uuid        REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id   uuid        REFERENCES clinics(id)  ON DELETE CASCADE,
  email       text,
  used_at     timestamptz,
  expires_at  timestamptz DEFAULT now() + interval '7 days',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invite_tokens_token_idx ON invite_tokens(token);

-- RLS
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- Public: look up own token by text (only non-used, non-expired)
CREATE POLICY "Public token lookup"
  ON invite_tokens FOR SELECT
  USING (used_at IS NULL AND expires_at > now());

-- Service role: full access (bypasses RLS)
