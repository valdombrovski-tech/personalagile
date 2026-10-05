import { formatTime, getTodayString } from './dates'
import type { Task } from './types'

export function isEventPast(
  task: Task,
  index: number,
  events: Task[],
  now: Date
) {
  if (task.status === 'done') return true
  if (!task.date) return false

  const today = getTodayString()

  if (task.date < today) return true
  if (task.date > today) return false

  const nowTime = now.toTimeString().slice(0, 5)

  if (task.end_time && nowTime >= formatTime(task.end_time)) {
    return true
  }

  const nextEvent = events
    .slice(index + 1)
    .find(
      (event) =>
        event.start_time &&
        formatTime(event.start_time) > formatTime(task.start_time)
    )

  return Boolean(nextEvent && nowTime >= formatTime(nextEvent.start_time))
}

export function getOverdueTasks(tasks: Task[]) {
  const today = getTodayString()

  return tasks
    .filter(
      (task) =>
        task.status === 'active' &&
        task.type === 'task' &&
        task.date !== null &&
        task.date < today
    )
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
}
