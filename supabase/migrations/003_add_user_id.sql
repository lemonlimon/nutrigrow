-- ─────────────────────────────────────────────────────────────────────────────
-- MIZAN Health — Migration 003: Add user_id to patients
--
-- Runs AFTER 002_patients.sql.
-- Links each patient row to their Supabase Auth account once they sign up.
-- Adds an RLS policy so authenticated patients can read their own row.
--
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Add user_id — nullable until the patient completes /join/signup
alter table patients
  add column if not exists user_id uuid references auth.users(id);

create index if not exists patients_user_id_idx on patients (user_id);

-- Patients can read their own row after account creation
create policy "Patient can read own record"
  on patients for select
  using (user_id = auth.uid());
