import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { MealType, PlanItem } from './types'

const ITEM_SELECT =
  'id, user_id, plan_date, meal, grams, position, updated_by, updated_at, deleted_at, deleted_by, food:foods(*)'

type LoadedPlan = {
  key: string
  ownerId: string
  items: PlanItem[]
}

type AddItemInput = {
  date: string
  meal: MealType
  foodId: string
  grams: number
}

function isValidGrams(grams: number) {
  return Number.isFinite(grams) && grams > 0 && grams <= 5000
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Неизвестная ошибка'
}

export function usePlanItems(
  rangeStart: string,
  rangeEnd: string
): ReturnType<typeof usePlanItemsInternal>

export function usePlanItems(
  ownerId: string | null,
  rangeStart: string,
  rangeEnd: string
): ReturnType<typeof usePlanItemsInternal>

export function usePlanItems(
  first: string | null,
  second: string,
  third?: string
) {
  return usePlanItemsInternal(first, second, third)
}

function usePlanItemsInternal(
  first: string | null,
  second: string,
  third?: string
) {
  const usesExplicitOwner = third !== undefined

  const requestedOwnerId = usesExplicitOwner ? first : null
  const rangeStart = usesExplicitOwner ? second : first ?? ''
  const rangeEnd = third ?? second

  const requestKey = JSON.stringify([
    usesExplicitOwner,
    requestedOwnerId,
    rangeStart,
    rangeEnd,
  ])

  const [loadedPlan, setLoadedPlan] = useState<LoadedPlan | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)

  const refresh = useCallback(() => {
    setReloadVersion((current) => current + 1)
  }, [])

  const currentPlan =
    loadedPlan?.key === requestKey ? loadedPlan : null

  const items = currentPlan?.items ?? []

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | undefined

    function scheduleRefresh() {
      if (document.visibilityState !== 'visible') return

      if (refreshTimer !== undefined) {
        clearTimeout(refreshTimer)
      }

      refreshTimer = setTimeout(() => {
        refresh()
      }, 150)
    }

    window.addEventListener('focus', scheduleRefresh)
    window.addEventListener('pageshow', scheduleRefresh)
    document.addEventListener(
      'visibilitychange',
      scheduleRefresh
    )

    return () => {
      if (refreshTimer !== undefined) {
        clearTimeout(refreshTimer)
      }

      window.removeEventListener('focus', scheduleRefresh)
      window.removeEventListener('pageshow', scheduleRefresh)
      document.removeEventListener(
        'visibilitychange',
        scheduleRefresh
      )
    }
  }, [refresh])

  useEffect(() => {
    let active = true

    async function load() {
      setIsLoading(true)
      setError('')
      setLoadedPlan(null)

      try {
        let ownerId = requestedOwnerId

        if (!usesExplicitOwner) {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser()

          if (authError) throw authError

          if (!user) {
            throw new Error('Необходимо войти в аккаунт')
          }

          ownerId = user.id
        }

        if (!ownerId) return

        if (!rangeStart || !rangeEnd) {
          throw new Error('Не указан период плана')
        }

        if (!active) return

        const { data, error: loadError } = await supabase
          .from('plan_items')
          .select(ITEM_SELECT)
          .eq('user_id', ownerId)
          .gte('plan_date', rangeStart)
          .lte('plan_date', rangeEnd)
          .order('position')
          .order('created_at')

        if (loadError) throw loadError
        if (!active) return

        setLoadedPlan({
          key: requestKey,
          ownerId,
          items: (data ?? []) as unknown as PlanItem[],
        })
      } catch (loadError) {
        console.error(
          'Не удалось загрузить план питания:',
          loadError
        )

        if (active) {
          setLoadedPlan(null)
          setError(
            `Не удалось загрузить план питания: ${getErrorMessage(loadError)}`
          )
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [
    usesExplicitOwner,
    requestedOwnerId,
    rangeStart,
    rangeEnd,
    requestKey,
    reloadVersion,
  ])

  async function addItem(
    input: AddItemInput
  ): Promise<boolean> {
    if (!currentPlan) {
      setError('План ещё не загружен')
      return false
    }

    if (!isValidGrams(input.grams)) {
      setError('Вес должен быть больше 0 и не больше 5000 г')
      return false
    }

    const plan = currentPlan

    setError('')

    try {
      const mealItems = plan.items.filter(
        (item) =>
          item.plan_date === input.date &&
          item.meal === input.meal
      )

      const position =
        mealItems.reduce(
          (maxPosition, item) =>
            Math.max(maxPosition, item.position),
          -1
        ) + 1

      const { data, error: insertError } = await supabase
        .from('plan_items')
        .insert({
          user_id: plan.ownerId,
          plan_date: input.date,
          meal: input.meal,
          food_id: input.foodId,
          grams: input.grams,
          position,
        })
        .select(ITEM_SELECT)
        .single()

      if (insertError) throw insertError

      const newItem = data as unknown as PlanItem

      setLoadedPlan((current) => {
        if (!current || current.key !== plan.key) {
          return current
        }

        return {
          ...current,
          items: [...current.items, newItem],
        }
      })

      return true
    } catch (insertError) {
      console.error(
        'Не удалось добавить в план:',
        insertError
      )

      setError(
        `Не удалось добавить в план: ${getErrorMessage(insertError)}`
      )

      return false
    }
  }

  async function updateGrams(
    itemId: string,
    grams: number
  ): Promise<boolean> {
    if (!currentPlan) {
      setError('План ещё не загружен')
      return false
    }

    if (!isValidGrams(grams)) {
      setError('Вес должен быть больше 0 и не больше 5000 г')
      return false
    }

    const plan = currentPlan
    const existingItem = plan.items.find(
      (item) => item.id === itemId
    )

    if (!existingItem) {
      setError('Позиция не найдена')
      return false
    }

    if (existingItem.deleted_at) {
      setError('Удалённую позицию нельзя изменять')
      return false
    }

    setError('')

    try {
      const { data, error: updateError } = await supabase
        .from('plan_items')
        .update({ grams })
        .eq('id', itemId)
        .eq('user_id', plan.ownerId)
        .is('deleted_at', null)
        .select(ITEM_SELECT)
        .single()

      if (updateError) throw updateError

      const updatedItem = data as unknown as PlanItem

      setLoadedPlan((current) => {
        if (!current || current.key !== plan.key) {
          return current
        }

        return {
          ...current,
          items: current.items.map((item) =>
            item.id === itemId ? updatedItem : item
          ),
        }
      })

      return true
    } catch (updateError) {
      console.error(
        'Не удалось изменить вес:',
        updateError
      )

      setError(
        `Не удалось изменить вес: ${getErrorMessage(updateError)}`
      )

      return false
    }
  }

  async function removeItem(
    itemId: string
  ): Promise<boolean> {
    if (!currentPlan) {
      setError('План ещё не загружен')
      return false
    }

    const plan = currentPlan
    const existingItem = plan.items.find(
      (item) => item.id === itemId
    )

    if (!existingItem) {
      setError('Позиция не найдена')
      return false
    }

    if (existingItem.deleted_at) {
      return true
    }

    setError('')

    try {
      const { data, error: deleteError } = await supabase
        .from('plan_items')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .eq('user_id', plan.ownerId)
        .is('deleted_at', null)
        .select(ITEM_SELECT)
        .single()

      if (deleteError) throw deleteError

      const deletedItem = data as unknown as PlanItem

      setLoadedPlan((current) => {
        if (!current || current.key !== plan.key) {
          return current
        }

        return {
          ...current,
          items: current.items.map((item) =>
            item.id === itemId ? deletedItem : item
          ),
        }
      })

      return true
    } catch (deleteError) {
      console.error(
        'Не удалось убрать из плана:',
        deleteError
      )

      setError(
        `Не удалось убрать из плана: ${getErrorMessage(deleteError)}`
      )

      return false
    }
  }

  async function restoreItem(
    itemId: string
  ): Promise<boolean> {
    if (!currentPlan) {
      setError('План ещё не загружен')
      return false
    }

    const plan = currentPlan
    const existingItem = plan.items.find(
      (item) => item.id === itemId
    )

    if (!existingItem) {
      setError('Позиция не найдена')
      return false
    }

    if (!existingItem.deleted_at) return true

    setError('')

    try {
      const { data, error: restoreError } = await supabase
        .from('plan_items')
        .update({
          deleted_at: null,
          deleted_by: null,
        })
        .eq('id', itemId)
        .eq('user_id', plan.ownerId)
        .not('deleted_at', 'is', null)
        .select(ITEM_SELECT)
        .single()

      if (restoreError) throw restoreError

      const restoredItem = data as unknown as PlanItem

      setLoadedPlan((current) => {
        if (!current || current.key !== plan.key) {
          return current
        }

        return {
          ...current,
          items: current.items.map((item) =>
            item.id === itemId ? restoredItem : item
          ),
        }
      })

      return true
    } catch (restoreError) {
      console.error(
        'Не удалось восстановить позицию:',
        restoreError
      )

      setError(
        `Не удалось восстановить позицию: ${getErrorMessage(restoreError)}`
      )

      return false
    }
  }

  async function deleteItemPermanently(
    itemId: string
  ): Promise<boolean> {
    if (!currentPlan) {
      setError('План ещё не загружен')
      return false
    }

    const plan = currentPlan
    const existingItem = plan.items.find(
      (item) => item.id === itemId
    )

    if (!existingItem) {
      setError('Позиция не найдена')
      return false
    }

    if (!existingItem.deleted_at) {
      setError('Сначала уберите позицию из плана')
      return false
    }

    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('plan_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', plan.ownerId)
        .not('deleted_at', 'is', null)
        .select('id')
        .single()

      if (deleteError) throw deleteError

      setLoadedPlan((current) => {
        if (!current || current.key !== plan.key) {
          return current
        }

        return {
          ...current,
          items: current.items.filter(
            (item) => item.id !== itemId
          ),
        }
      })

      return true
    } catch (deleteError) {
      console.error(
        'Не удалось удалить позицию окончательно:',
        deleteError
      )

      setError(
        `Не удалось удалить позицию окончательно: ${getErrorMessage(deleteError)}`
      )

      return false
    }
  }

    return {
    items,
    isLoading,
    error,
    addItem,
    updateGrams,
    removeItem,
    restoreItem,
    deleteItemPermanently,
    refresh,
  }
}