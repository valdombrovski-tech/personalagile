import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Food, MealType } from './types'

const HISTORY_LIMIT = 300
const RESULT_LIMIT = 12
const STORAGE_KEY = 'nutrition:hidden-meal-favorites:v1'

type HistoryRow = {
  food: Food | Food[] | null
}

type HiddenFavorites = Record<string, string[]>

function readHiddenFavorites(): HiddenFavorites {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {}
    }

    const result: HiddenFavorites = {}

    Object.entries(parsed).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        result[key] = value.filter(
          (id): id is string => typeof id === 'string'
        )
      }
    })

    return result
  } catch {
    return {}
  }
}

export function useMealFavorites(
  meal: MealType,
  ownerId: string
) {
  const [rankedFoods, setRankedFoods] = useState<Food[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hiddenByMeal, setHiddenByMeal] =
    useState<HiddenFavorites>(readHiddenFavorites)

  useEffect(() => {
    let isActive = true

    async function load() {
      setIsLoading(true)
      setRankedFoods([])

      try {
        const { data, error } = await supabase
          .from('plan_items')
          .select('food:foods(*)')
          .eq('meal', meal)
          .order('created_at', { ascending: false })
          .limit(HISTORY_LIMIT)

        if (error) throw error

        const rows = (data ?? []) as unknown as HistoryRow[]

        const stats = new Map<
          string,
          { food: Food; count: number; firstSeen: number }
        >()

        rows.forEach((row, index) => {
          const food = Array.isArray(row.food) ? row.food[0] : row.food

          if (!food) return

          const current = stats.get(food.id)

          if (current) {
            current.count += 1
          } else {
            stats.set(food.id, {
              food,
              count: 1,
              firstSeen: index,
            })
          }
        })

        const sorted = Array.from(stats.values())
          .sort((a, b) => b.count - a.count || a.firstSeen - b.firstSeen)
          .map((item) => item.food)

        if (isActive) {
          setRankedFoods(sorted)
        }
      } catch (loadError) {
        console.error('Не удалось загрузить частые продукты:', loadError)

        if (isActive) {
          setRankedFoods([])
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isActive = false
    }
  }, [meal])

  const hiddenKey = `${ownerId}:${meal}`

  const hiddenIds = new Set(hiddenByMeal[hiddenKey] ?? [])

  const favorites = rankedFoods
    .filter((food) => !hiddenIds.has(food.id))
    .slice(0, RESULT_LIMIT)

  function hideFavorite(foodId: string): boolean {
    try {
      const saved = readHiddenFavorites()

            const next: HiddenFavorites = {
        ...saved,
        [hiddenKey]: Array.from(
          new Set([...(saved[hiddenKey] ?? []), foodId])
        ),
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setHiddenByMeal(next)

      return true
    } catch (error) {
      console.error('Не удалось скрыть продукт из популярных:', error)
      return false
    }
  }

  return { favorites, isLoading, hideFavorite }
}