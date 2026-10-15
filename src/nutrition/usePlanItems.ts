import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { MealType, PlanItem } from './types'

const ITEM_SELECT = 'id, plan_date, meal, grams, position, food:foods(*)'

export function usePlanItems(rangeStart: string, rangeEnd: string) {
  const [items, setItems] = useState<PlanItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)

      try {
        const { data, error: loadError } = await supabase
          .from('plan_items')
          .select(ITEM_SELECT)
          .gte('plan_date', rangeStart)
          .lte('plan_date', rangeEnd)
          .order('position')
          .order('created_at')

        if (loadError) throw loadError
        if (!isMounted) return

        setItems((data ?? []) as unknown as PlanItem[])
        setError('')
      } catch (loadError) {
        console.error('Не удалось загрузить план питания:', loadError)

        if (isMounted) {
          setError('Не удалось загрузить план питания')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [rangeStart, rangeEnd])

  async function addItem(input: {
    date: string
    meal: MealType
    foodId: string
    grams: number
  }): Promise<boolean> {
    if (!Number.isFinite(input.grams) || input.grams <= 0 || input.grams > 5000) {
      setError('Вес должен быть от 1 до 5000 г')
      return false
    }

    setError('')

    try {
      const position = items.filter(
        (item) => item.plan_date === input.date && item.meal === input.meal
      ).length

      const { data, error: insertError } = await supabase
        .from('plan_items')
        .insert({
          plan_date: input.date,
          meal: input.meal,
          food_id: input.foodId,
          grams: input.grams,
          position,
        })
        .select(ITEM_SELECT)
        .single()

      if (insertError) throw insertError

      setItems((current) => [...current, data as unknown as PlanItem])

      return true
    } catch (insertError) {
      console.error('Не удалось добавить в план:', insertError)
      setError('Не удалось добавить в план')

      return false
    }
  }

  async function updateGrams(itemId: string, grams: number): Promise<boolean> {
    if (!Number.isFinite(grams) || grams <= 0 || grams > 5000) {
      setError('Вес должен быть от 1 до 5000 г')
      return false
    }

    setError('')

    try {
      const { data, error: updateError } = await supabase
        .from('plan_items')
        .update({ grams })
        .eq('id', itemId)
        .select(ITEM_SELECT)
        .single()

      if (updateError) throw updateError

      setItems((current) =>
        current.map((item) =>
          item.id === itemId ? (data as unknown as PlanItem) : item
        )
      )

      return true
    } catch (updateError) {
      console.error('Не удалось изменить вес:', updateError)
      setError('Не удалось изменить вес')

      return false
    }
  }

  async function removeItem(itemId: string): Promise<boolean> {
    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('plan_items')
        .delete()
        .eq('id', itemId)

      if (deleteError) throw deleteError

      setItems((current) => current.filter((item) => item.id !== itemId))

      return true
    } catch (deleteError) {
      console.error('Не удалось убрать из плана:', deleteError)
      setError('Не удалось убрать из плана')

      return false
    }
  }

  return { items, isLoading, error, addItem, updateGrams, removeItem }
}