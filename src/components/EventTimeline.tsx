import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'
import { TaskCard } from './TaskCard'
import { formatTime } from '../lib/dates'
import { getTaskCardProps } from '../lib/taskCardProps'
import { isEventPast } from '../lib/taskSelectors'
import type { TaskActions, TaskSelection } from '../lib/taskViewTypes'
import type { Task } from '../lib/types'

type EventTimelineProps = {
  events: Task[]
  now: Date
  selection: TaskSelection
  actions: TaskActions
  renderActions: (task: Task) => ReactNode
  emptyText: string
}

export function EventTimeline({
  events,
  now,
  selection,
  actions,
  renderActions,
  emptyText,
}: EventTimelineProps) {
  if (!events.length) {
    return <EmptyState text={emptyText} />
  }

  return (
    <div className="timeline">
      {events.map((task, index) => {
        const isPast = isEventPast(task, index, events, now)

        return (
          <div
            className={`timeline-item ${isPast ? 'is-past' : ''}`}
            key={task.id}
          >
            <span className="timeline-dot" aria-hidden="true" />
            <p className="timeline-time">
              {formatTime(task.start_time)}
              {task.end_time ? ` – ${formatTime(task.end_time)}` : ''}
            </p>
            <TaskCard
              {...getTaskCardProps(task, selection, actions)}
              actions={renderActions(task)}
              checkboxInside
            />
          </div>
        )
      })}
    </div>
  )
}
