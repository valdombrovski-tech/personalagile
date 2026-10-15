import type { NutrientTotals, PlanItem } from './types'

export function emptyTotals(): NutrientTotals {
  return { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, micros: {} }
}

export function sumTotals(items: PlanItem[]): NutrientTotals {
  const total = emptyTotals()

  for (const item of items) {
    const factor = item.grams / 100

    total.kcal += item.food.kcal * factor
    total.protein += item.food.protein * factor
    total.fat += item.food.fat * factor
    total.carbs += item.food.carbs * factor
    total.fiber += item.food.fiber * factor

    for (const [key, value] of Object.entries(item.food.micros ?? {})) {
      total.micros[key] = (total.micros[key] ?? 0) + value * factor
    }
  }

  return total
}

export function formatNutrient(value: number) {
  return String(Math.round(value * 10) / 10)
}