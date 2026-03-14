# MIZAN Health — Decision Log

---

## Food Photo AI

### Nutritional Estimation (decided 2026-03-14)

When `ANTHROPIC_API_KEY` is real, the food-log API call should return:

- Dish name
- Estimated calories (range acceptable, e.g. 600–800 kcal)
- Protein / carbs / fat estimates in grams
- Red / Yellow / Green tag
- Brief coaching note in English and Arabic
- Uncertainty flag if dish is unrecognized

Store `calories_estimate_low` and `calories_estimate_high` in the `food_logs` table.
Display weekly caloric range total to both patient and clinic.

### Mock Mode (decided 2026-03-14)

`USE_MOCK_AI=true` in `.env.local` bypasses the Anthropic call entirely.

To go live:
1. Set `USE_MOCK_AI=false` in `.env.local`
2. Set a real `ANTHROPIC_API_KEY` in `.env.local`
3. Restart the dev server after any `.env.local` change

---

## Weekly Clinic Digest (to build)

Clinic sees a per-patient weekly summary:

- Weight trend (direction + delta only — not raw numbers)
- Estimated caloric intake range for the week
- Context log summary (e.g. "2x family gathering, 1x stressed")
- No raw food photos sent to clinic
