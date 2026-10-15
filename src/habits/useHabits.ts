import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Habit, HabitLog } from './types'

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingDates, setPendingDates] = useState<string[]>([])

  const pendingRef = useRef(new Set<string>())

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const [habitsResult, logsResult] = await Promise.all([
          supabase
            .from('habits')
            .select('*')
            .is('archived_at', null)
            .order('position')
            .order('created_at'),

          supabase
            .from('habit_logs')
            .select('id, habit_id, log_date, status'),
        ])

        if (habitsResult.error) throw habitsResult.error
        if (logsResult.error) throw logsResult.error

        if (!isMounted) return

        setHabits((habitsResult.data ?? []) as Habit[])
        setLogs((logsResult.data ?? []) as HabitLog[])
        setError('')
      } catch (loadError) {
        console.error('Не удалось загрузить привычки:', loadError)

        if (isMounted) {
          setError('Не удалось загрузить привычки')
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

  async function addHabit(input: {
    title: string
    color: string
    icon: string
  }): Promise<boolean> {
    const title = input.title.trim()

    if (!title || title.length > 100) {
      setError('Название должно содержать от 1 до 100 символов')
      return false
    }

    try {
      const { data, error: insertError } = await supabase
        .from('habits')
        .insert({
          title,
          color: input.color,
          icon: input.icon,
          position: habits.length,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setHabits((current) => [...current, data as Habit])
      setError('')

      return true
    } catch (insertError) {
      console.error('Не удалось создать привычку:', insertError)
      setError('Не удалось создать привычку')

      return false
    }
  }

      async function updateHabit(
    habitId: string,
    input: {
      title: string
      icon: string
    }
  ): Promise<boolean> {
    const title = input.title.trim()
    const icon = input.icon.trim()

    if (!title || title.length > 100) {
      setError('Название должно содержать от 1 до 100 символов')
      return false
    }

    if (!icon || icon.length > 64) {
      setError('Выбери emoji для привычки')
      return false
    }

    setError('')

    try {
      const { data, error: updateError } = await supabase
        .from('habits')
        .update({
          title,
          icon,
        })
        .eq('id', habitId)
        .select()
        .single()

      if (updateError) throw updateError

      setHabits((current) =>
        current.map((habit) =>
          habit.id === habitId
            ? (data as Habit)
            : habit
        )
      )

      return true
    } catch (updateError) {
      console.error(
        'Не удалось изменить привычку:',
        updateError
      )

      setError(
        'Не удалось сохранить изменения. Попробуй ещё раз.'
      )

      return false
    }
  }


  async function cycleLog(
    habitId: string,
    date: string
  ): Promise<void> {
    const key = `${habitId}:${date}`

    if (pendingRef.current.has(key)) return

    pendingRef.current.add(key)
    setPendingDates(Array.from(pendingRef.current))
    setError('')

    try {
      const existing = logs.find(
        (log) =>
          log.habit_id === habitId &&
          log.log_date === date
      )

      if (!existing) {
        const { data, error: insertError } = await supabase
          .from('habit_logs')
          .insert({
            habit_id: habitId,
            log_date: date,
            status: 'done',
          })
          .select('id, habit_id, log_date, status')
          .single()

        if (insertError) throw insertError

        setLogs((current) => [...current, data as HabitLog])
        return
      }

      if (existing.status === 'done') {
        const { data, error: updateError } = await supabase
          .from('habit_logs')
          .update({ status: 'failed' })
          .eq('id', existing.id)
          .select('id, habit_id, log_date, status')
          .single()

        if (updateError) throw updateError

        setLogs((current) =>
          current.map((log) =>
            log.id === existing.id
              ? (data as HabitLog)
              : log
          )
        )
        return
      }

      const { data, error: deleteError } = await supabase
        .from('habit_logs')
        .delete()
        .eq('id', existing.id)
        .select('id')
        .single()

      if (deleteError) throw deleteError

      setLogs((current) =>
        current.filter((log) => log.id !== data.id)
      )
    } catch (saveError) {
      console.error('Не удалось сохранить отметку:', saveError)
      setError('Не удалось сохранить отметку. Попробуй ещё раз.')
    } finally {
      pendingRef.current.delete(key)
      setPendingDates(Array.from(pendingRef.current))
    }
  }

   return {
    habits,
    logs,
    isLoading,
    error,
    pendingDates,
    addHabit,
        updateHabit,
    cycleLog,
  }
}