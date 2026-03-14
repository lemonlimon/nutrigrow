-- ─────────────────────────────────────────────────────────────────────────────
-- MIZAN Health — Migration 002: Clinics + Patients
--
-- NOTE: 001_init.sql (profiles + assessments) is superseded by this scope.
--       Those tables are no longer used. Drop them manually if desired.
--
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. CLINICS ────────────────────────────────────────────────────────────────
-- One row per clinic. Each clinic has one Supabase Auth account for MVP.
-- auth.uid() for a logged-in clinic session = clinics.id

create table if not exists clinics (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now() not null
);

alter table clinics enable row level security;

create policy "Clinic can read own record"
  on clinics for select
  using (id = auth.uid());


-- ── 2. PATIENTS ───────────────────────────────────────────────────────────────
-- One row per enrolled patient. Created by clinic staff at enrollment.
-- BMI is computed silently — never displayed in any UI.

create table patients (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references clinics(id),

  -- Baseline biometrics (stored in metric; UI converts display units)
  first_name  text         not null,
  sex         text         check (sex in ('male', 'female')),
  age         integer      check (age between 18 and 75),
  weight_kg   numeric(5,1),
  height_cm   numeric(5,1),
  waist_cm    numeric(5,1),

  -- Computed and stored — backend use only, never surfaced in any UI
  bmi         numeric(4,1) generated always as (
                round(
                  (weight_kg / ((height_cm / 100.0) * (height_cm / 100.0)))::numeric,
                  1
                )
              ) stored,

  -- Contact
  contact_method     text check (contact_method in ('email', 'sms')),
  contact_value      text not null,
  preferred_language text check (preferred_language in ('en', 'ar')) default 'en',

  -- Invite lifecycle
  invite_token            uuid        not null default gen_random_uuid(),
  invite_token_expires_at timestamptz not null default (now() + interval '72 hours'),
  invite_status           text        check (invite_status in ('invited', 'active', 'no_response'))
                                      default 'invited',

  enrolled_at timestamptz default now() not null
);


-- ── 3. INDEXES ────────────────────────────────────────────────────────────────
-- invite_token: queried on every unauthenticated /join?token= hit — must be fast
-- clinic_id:    every RLS policy and patient list query filters on this

create unique index patients_invite_token_idx on patients (invite_token);
create index        patients_clinic_id_idx    on patients (clinic_id);


-- ── 4. ROW-LEVEL SECURITY — PATIENTS ─────────────────────────────────────────
alter table patients enable row level security;

-- Clinic staff: full read/write access to their own patients
create policy "Clinic can read own patients"
  on patients for select
  using (clinic_id = auth.uid());

create policy "Clinic can enroll patients"
  on patients for insert
  with check (clinic_id = auth.uid());

create policy "Clinic can update own patients"
  on patients for update
  using  (clinic_id = auth.uid())
  with check (clinic_id = auth.uid());

-- Unauthenticated token lookup — /join?token=UUID hits this before patient has an account.
-- Exposes ONLY the columns needed: id, first_name, preferred_language,
-- invite_status, invite_token_expires_at. Biometrics not in this path.
-- Patient sees their own biometric baseline only after account creation (authenticated).
create policy "Public invite token lookup"
  on patients for select
  using (
    invite_token is not null
    and invite_token_expires_at > now()
  );
