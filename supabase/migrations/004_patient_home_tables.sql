-- ─────────────────────────────────────────────────────────────────────────────
-- MIZAN Health — Migration 004: Patient Home Tables
--
-- Requires 002_patients.sql and 003_add_user_id.sql to be run first.
--
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. WEIGHT LOGS ────────────────────────────────────────────────────────────

create table weight_logs (
  id         uuid        primary key default gen_random_uuid(),
  patient_id uuid        not null references patients(id),
  weight_kg  numeric(5,1) not null,
  logged_at  timestamptz  not null default now()
);

create index weight_logs_patient_id_idx on weight_logs (patient_id);

alter table weight_logs enable row level security;

create policy "Patient can insert own weight logs"
  on weight_logs for insert
  with check (patient_id in (select id from patients where user_id = auth.uid()));

create policy "Patient can read own weight logs"
  on weight_logs for select
  using (patient_id in (select id from patients where user_id = auth.uid()));

create policy "Clinic can read patient weight logs"
  on weight_logs for select
  using (patient_id in (select id from patients where clinic_id = auth.uid()));


-- ── 2. FOOD LOGS ──────────────────────────────────────────────────────────────

create table food_logs (
  id         uuid        primary key default gen_random_uuid(),
  patient_id uuid        not null references patients(id),
  dish_name  text,
  tag        text        check (tag in ('red', 'yellow', 'green')),
  note_en    text,
  note_ar    text,
  logged_at  timestamptz not null default now()
);

create index food_logs_patient_id_idx on food_logs (patient_id);

alter table food_logs enable row level security;

create policy "Patient can insert own food logs"
  on food_logs for insert
  with check (patient_id in (select id from patients where user_id = auth.uid()));

create policy "Patient can read own food logs"
  on food_logs for select
  using (patient_id in (select id from patients where user_id = auth.uid()));

create policy "Clinic can read patient food logs"
  on food_logs for select
  using (patient_id in (select id from patients where clinic_id = auth.uid()));


-- ── 3. CONTEXT LOGS ───────────────────────────────────────────────────────────

create table context_logs (
  id         uuid        primary key default gen_random_uuid(),
  patient_id uuid        not null references patients(id),
  context    text        check (context in ('regular', 'family_gathering', 'ramadan', 'travel', 'stressed')),
  logged_at  timestamptz not null default now()
);

create index context_logs_patient_id_idx on context_logs (patient_id);

alter table context_logs enable row level security;

create policy "Patient can insert own context logs"
  on context_logs for insert
  with check (patient_id in (select id from patients where user_id = auth.uid()));

create policy "Patient can read own context logs"
  on context_logs for select
  using (patient_id in (select id from patients where user_id = auth.uid()));

create policy "Clinic can read patient context logs"
  on context_logs for select
  using (patient_id in (select id from patients where clinic_id = auth.uid()));
