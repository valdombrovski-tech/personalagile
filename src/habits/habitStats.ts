import type { Habit, HabitLog } from './types'

export const MIN_MARKS_FOR_RATIO = 3

export type HabitStat = {
  habit: Habit
  done: number
  failed: number
  marked: number
  bestStreak: number
  ratio: number
}

function daysBetween(a: string, b: string) {
  const first = Date.parse(`${a}T00:00:00Z`)
  const second = Date.parse(`${b}T00:00:00Z`)
  return Math.round((second - first) / 86400000)
}

export function getHabitStats(
  habits: Habit[],
  logs: HabitLog[]
): HabitStat[] {
  return habits.map((habit) => {
    const habitLogs = logs.filter((log) => log.habit_id === habit.id)

    const doneDates = habitLogs
      .filter((log) => log.status === 'done')
      .map((log) => log.log_date)
      .sort()

    const failed = habitLogs.filter(
      (log) => log.status === 'failed'
    ).length

    let bestStreak = 0
    let run = 0
    let previous: string | null = null

    for (const date of doneDates) {
      run = previous && daysBetween(previous, date) === 1 ? run + 1 : 1
      bestStreak = Math.max(bestStreak, run)
      previous = date
    }

    const marked = doneDates.length + failed

    return {
      habit,
      done: doneDates.length,
      failed,
      marked,
      bestStreak,
      ratio: marked > 0 ? doneDates.length / marked : 0,
    }
  })
}