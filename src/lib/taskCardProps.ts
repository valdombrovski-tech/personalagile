import type { Task } from './types'
import type { TaskActions, TaskSelection } from './taskViewTypes'

export function getTaskCardProps(
  task: Task,
  selection: TaskSelection,
  actions: TaskActions
) {
  return {
    task,
    isOpen: selection.selectedTaskId === task.id,
    isSwiped: selection.swipedTaskId === task.id,
    onToggleDetails: selection.onToggleDetails,
    onSwipeChange: selection.onSwipeChange,
    onUpdate: actions.update,
    onMoveToInbox: actions.moveToInbox,
    onMoveToIdeas: actions.moveToIdeas,
    onMoveToDone: actions.moveToDone,
  }
}
