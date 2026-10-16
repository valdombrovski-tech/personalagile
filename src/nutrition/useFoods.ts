import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Food } from './types'

export type NewFoodInput = {
  name: string
  brand?: string
  barcode?: string
  kcal: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  micros?: Record<string, number>
  source?: 'manual' | 'open_food_facts' | 'usda'
}

export function useFoods() {
  const [foods, setFoods] = useState<Food[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) throw authError
        if (!user) throw new Error('Необходимо войти в аккаунт')

        const { data, error: loadError } = await supabase
          .from('foods')
          .select('*')
          .or(`owner_id.eq.${user.id},visibility.eq.shared`)
          .order('name')

        if (loadError) throw loadError
        if (!isMounted) return

        setFoods((data ?? []) as Food[])
        setError('')
      } catch (loadError) {
        console.error('Не удалось загрузить продукты:', loadError)

        if (isMounted) {
          setFoods([])
          setError('Не удалось загрузить продукты')
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
  }, [])

  async function addFood(input: NewFoodInput): Promise<Food | null> {
    const name = input.name.trim()

    const numbers = [
      input.kcal,
      input.protein,
      input.fat,
      input.carbs,
      input.fiber,
    ]

    if (!name || name.length > 200) {
      setError('Название должно содержать от 1 до 200 символов')
      return null
    }

    if (numbers.some((value) => !Number.isFinite(value) || value < 0)) {
      setError('Значения питательных веществ должны быть не меньше нуля')
      return null
    }

    setError('')

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError
      if (!user) throw new Error('Необходимо войти в аккаунт')

      const { data, error: insertError } = await supabase
        .from('foods')
        .insert({
          owner_id: user.id,
          name,
          brand: input.brand?.trim() || null,
          barcode: input.barcode?.trim() || null,
          kcal: input.kcal,
          protein: input.protein,
          fat: input.fat,
          carbs: input.carbs,
          fiber: input.fiber,
          micros: input.micros ?? {},
          source: input.source ?? 'manual',
          visibility: 'private',
          status: 'unverified',
        })
        .select()
        .single()

      if (insertError) throw insertError

      const food = data as Food

      setFoods((current) =>
        [...current.filter((item) => item.id !== food.id), food].sort(
          (a, b) => a.name.localeCompare(b.name, 'ru')
        )
      )

      return food
    } catch (insertError) {
      console.error('Не удалось создать продукт:', insertError)
      setError('Не удалось создать продукт')

      return null
    }
  }

  return { foods, isLoading, error, addFood }
}