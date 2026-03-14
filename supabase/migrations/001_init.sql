-- ─────────────────────────────────────────────────────────────────────────────
-- MIZAN Health — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Physician Profiles ─────────────────────────────────────────────────────
-- Linked 1-to-1 with Supabase Auth users (same UUID).
-- Created automatically when a user signs up (see trigger below).

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  name_ar     text,                                   -- Arabic display name (optional)
  country     text check (country in ('SA', 'AE')),
  clinic_name text,
  created_at  timestamptz default now() not null
);

-- Row-level security: each physician sees only their own profile
alter table public.profiles enable row level security;

create policy "Physicians can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Physicians can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── 2. Assessments ────────────────────────────────────────────────────────────
-- One row per physician-run assessment. No patient PII stored —
-- patient_ref is the physician's own de-identified label (e.g. "P-042").

create table public.assessments (
  id            uuid primary key default gen_random_uuid(),
  physician_id  uuid references public.profiles(id) on delete cascade not null,

  -- Patient identity (de-identified)
  patient_ref   text,                                 -- physician's own reference only

  -- Form inputs (raw, stored for audit + re-run)
  country       text check (country in ('SA', 'AE')),
  sex           text check (sex in ('male', 'female')),
  age           integer check (age >= 18 and age <= 120),
  weight_kg     numeric(5,1),
  height_cm     numeric(5,1),
  waist_cm      numeric(5,1),                         -- optional
  activity      text,
  screen_time   text,
  fast_food     text,
  family_history text,
  comorbidities text[]  default '{}',                 -- ['hypertension', 'type2_diabetes', ...]
  clinical_notes text,

  -- Computed results (denormalised for easy querying / dashboards)
  bmi_value          numeric(4,1),
  bmi_category_gulf  text,
  risk_score         integer,
  max_score          integer,
  risk_tier          text check (risk_tier in ('low', 'moderate', 'high', 'very-high')),
  traffic_light      text check (traffic_light in ('green', 'yellow', 'red')),
  physician_alert    boolean default false,

  -- Full RiskResult object — used by the AI report generator
  assessment_json    jsonb,

  created_at    timestamptz default now() not null
);

-- Row-level security: each physician sees only their own assessments
alter table public.assessments enable row level security;

create policy "Physicians can view their own assessments"
  on public.assessments for select
  using (auth.uid() = physician_id);

create policy "Physicians can insert their own assessments"
  on public.assessments for insert
  with check (auth.uid() = physician_id);

create policy "Physicians can update their own assessments"
  on public.assessments for update
  using (auth.uid() = physician_id);

-- Index for fast lookup by physician
create index on public.assessments (physician_id, created_at desc);
