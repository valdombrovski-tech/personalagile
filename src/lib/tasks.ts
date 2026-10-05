import { formatTime } from './dates'
import type { Task } from './types'

export function getTaskType(
  date: string | null,
  startTime: string | null
): Task['type'] {
  return date && startTime ? 'event' : 'task'
}

export function getTaskMeta(task: Task) {
  const parts: string[] = []

  if (task.date) {
    parts.push(
      new Date(`${task.date}T00:00:00`).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
      })
    )
  }

  if (task.start_time) {
    const time = task.end_time
      ? `${formatTime(task.start_time)}–${formatTime(task.end_time)}`
      : formatTime(task.start_time)

    parts.push(time)
  }

  if (task.type === 'event') {
    parts.push('Событие')
  }

  return parts.join(' · ')
}