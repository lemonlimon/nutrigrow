-- ─────────────────────────────────────────────────────────────────────────────
-- MIZAN Health — Migration 006: Add meal_score to food_logs
--
-- Adds meal_score (1–10) to each food_log row.
-- Computed server-side at confirm time based on tag:
--   green  → 8–9   (balanced)
--   yellow → 5–7   (moderate)
--   red    → 2–4   (indulgent)
--
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to run multiple times (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'food_logs' and column_name = 'meal_score'
  ) then
    alter table food_logs
      add column meal_score smallint check (meal_score between 1 and 10);
  end if;
end $$;
