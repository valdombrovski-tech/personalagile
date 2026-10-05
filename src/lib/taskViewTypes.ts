import type { Task } from './types'

export type TaskActions = {
  update: (taskId: string, changes: Partial<Task>) => Promise<void>
  moveToInProgress: (task: Task) => Promise<void>
  moveToInbox: (task: Task) => Promise<void>
  moveToIdeas: (task: Task) => Promise<void>
  moveToDone: (task: Task) => Promise<void>
  moveToToday: (task: Task) => Promise<void>
  moveAllToToday: (tasks: Task[]) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
}

export type TaskSelection = {
  selectedTaskId: string | null
  swipedTaskId: string | null
  onToggleDetails: (taskId: string) => void
  onSwipeChange: (taskId: string | null) => void
}
