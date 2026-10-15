export type Habit = {
  id: string
  title: string
  color: string
  icon: string
  position: number
  archived_at: string | null
  created_at: string
}

export type HabitStatus = 'done' | 'failed'

export type HabitLog = {
  id: string
  habit_id: string
  log_date: string
  status: HabitStatus
}