import type { NutrientTotals, PlanItem } from './types'

import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    void supabase.auth.getUser().then(({ data, error }) => {
      if (!isActive) return

      if (error) {
        console.error('Не удалось получить пользователя:', error)
        setUserId(null)
        return
      }

      setUserId(data.user?.id ?? null)
    })

    return () => {
      isActive = false
    }
  }, [])

  return userId
}

export function emptyTotals(): NutrientTotals {
  return { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, micros: {} }
}

export function sumTotals(items: PlanItem[]): NutrientTotals {
  const total = emptyTotals()

    for (const item of items) {
    if (item.deleted_at) continue

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