-- ─────────────────────────────────────────────────────────────────────────────
-- MIZAN Health — Migration 005: Add macro columns to food_logs
--
-- Adds protein_g, carbs_g, fat_g columns to food_logs table.
-- Also adds calories_estimate_low, calories_estimate_high, meal_type
-- in case they were not previously added via the dashboard.
--
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to run multiple times (uses IF NOT EXISTS via DO block).
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin

  -- calories_estimate_low (may already exist if added via dashboard)
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'food_logs' and column_name = 'calories_estimate_low'
  ) then
    alter table food_logs add column calories_estimate_low integer;
  end if;

  -- calories_estimate_high
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'food_logs' and column_name = 'calories_estimate_high'
  ) then
    alter table food_logs add column calories_estimate_high integer;
  end if;

  -- meal_type
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'food_logs' and column_name = 'meal_type'
  ) then
    alter table food_logs add column meal_type text
      check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack'));
  end if;

  -- protein_g
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'food_logs' and column_name = 'protein_g'
  ) then
    alter table food_logs add column protein_g integer;
  end if;

  -- carbs_g
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'food_logs' and column_name = 'carbs_g'
  ) then
    alter table food_logs add column carbs_g integer;
  end if;

  -- fat_g
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'food_logs' and column_name = 'fat_g'
  ) then
    alter table food_logs add column fat_g integer;
  end if;

end $$;
