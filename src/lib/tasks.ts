import type { Task } from './types'

export function getTaskType(
  date: string | null,
  startTime: string | null
): Task['type'] {
  return date && startTime ? 'event' : 'task'
}