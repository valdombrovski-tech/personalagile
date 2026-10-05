import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'
import { TaskCard } from './TaskCard'
import { getTaskCardProps } from '../lib/taskCardProps'
import type { TaskActions, TaskSelection } from '../lib/taskViewTypes'
import type { Task } from '../lib/types'

type TaskListProps = {
  tasks: Task[]
  selection: TaskSelection
  actions: TaskActions
  renderActions: (task: Task) => ReactNode
  emptyText: string
  showDoneCheckbox?: boolean
  toggleDone?: boolean
  hideAreaIcon?: boolean
}

export function TaskList({
  tasks,
  selection,
  actions,
  renderActions,
  emptyText,
  showDoneCheckbox = true,
  toggleDone = false,
  hideAreaIcon = false,
}: TaskListProps) {
  if (!tasks.length) {
    return <EmptyState text={emptyText} />
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          {...getTaskCardProps(task, selection, actions)}
          actions={renderActions(task)}
          showDoneCheckbox={showDoneCheckbox}
          toggleDone={toggleDone}
          hideAreaIcon={hideAreaIcon}
        />
      ))}
    </div>
  )
}
