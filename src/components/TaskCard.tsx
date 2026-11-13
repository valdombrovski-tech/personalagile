import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { Inbox, Lightbulb, Check, Clock } from 'lucide-react'
import { LifeAreaIcon, LifeAreaTag } from './LifeAreas'
import { TaskDetails } from './TaskDetails'
import { getTaskMeta } from '../lib/tasks'
import { formatTime } from '../lib/dates'
import {
  SWIPE_BUTTON_WIDTH,
  handleSwipeEnd,
  handleSwipeMove,
  handleSwipeStart,
  isSwipeJustHappened,
} from '../lib/swipe'
import type { Task } from '../lib/types'

type TaskCardProps = {
  task: Task
  isOpen: boolean
  isSwiped: boolean
  onToggleDetails: (taskId: string) => void
  onSwipeChange: (taskId: string | null) => void
  onUpdate: (taskId: string, changes: Partial<Task>) => Promise<void>
  onMoveToInbox: (task: Task) => Promise<void>
  onMoveToIdeas: (task: Task) => Promise<void>
  onMoveToDone: (task: Task) => Promise<void>
  actions?: ReactNode
  showDoneCheckbox?: boolean
  checkboxInside?: boolean
  toggleDone?: boolean
  hideAreaIcon?: boolean
  variant?: 'timeline' | 'todo'
}

export function TaskCard({
  task,
  isOpen,
  isSwiped: isSwipedProp,
  onToggleDetails,
  onSwipeChange,
  onUpdate,
  onMoveToInbox,
  onMoveToIdeas,
  onMoveToDone,
  actions,
  showDoneCheckbox = true,
  checkboxInside = false,
  toggleDone = false,
  hideAreaIcon = false,
  variant,
}: TaskCardProps) {
  const meta = getTaskMeta(task)
  const cardVariant = variant ?? (hideAreaIcon ? 'todo' : undefined)
  const timeRange = task.start_time
    ? task.end_time
      ? `${formatTime(task.start_time)}–${formatTime(task.end_time)}`
      : formatTime(task.start_time)
    : ''
  const canSwipe = !isOpen && task.status !== 'done'
  const isSwiped = canSwipe && isSwipedProp
  const swipeButtonsCount =
    1 + (task.status !== 'inbox' ? 1 : 0) + (task.status !== 'idea' ? 1 : 0)
  const swipeWidth = swipeButtonsCount * SWIPE_BUTTON_WIDTH

  const finishSwipe = (event: ReactPointerEvent<HTMLElement>) =>
    handleSwipeEnd(event, swipeWidth, (open) =>
      onSwipeChange(open ? task.id : null)
    )

  const swipeHandlers = canSwipe
    ? {
        onPointerDown: handleSwipeStart,
        onPointerMove: (event: ReactPointerEvent<HTMLElement>) =>
          handleSwipeMove(event, swipeWidth, isSwiped),
        onPointerUp: finishSwipe,
        onPointerCancel: finishSwipe,
        onPointerLeave: finishSwipe,
      }
    : {}

  return (
    <div className="swipe-wrap">
      {canSwipe && (
        <div className="swipe-actions" style={{ width: swipeWidth }}>
          {task.status !== 'inbox' && (
            <button
              className="swipe-action swipe-inbox"
              type="button"
              aria-label="В Inbox"
              title="В Inbox"
              onClick={() => {
                onSwipeChange(null)
                void onMoveToInbox(task)
              }}
            >
              <Inbox size={20} />
            </button>
          )}
          {task.status !== 'idea' && (
            <button
              className="swipe-action swipe-ideas"
              type="button"
              aria-label="В Ideas"
              title="В Ideas"
              onClick={() => {
                onSwipeChange(null)
                void onMoveToIdeas(task)
              }}
            >
              <Lightbulb size={20} />
            </button>
          )}
          <button
            className="swipe-action swipe-done"
            type="button"
            aria-label="Готово"
            title="Готово"
            onClick={() => {
              onSwipeChange(null)
              void onMoveToDone(task)
            }}
          >
            <Check size={20} />
          </button>
        </div>
      )}

      <article
        {...swipeHandlers}
        style={
          isSwiped ? { transform: `translateX(-${swipeWidth}px)` } : undefined
        }
        className={`task-item swipe-content ${
          cardVariant ? `task-card--${cardVariant}` : ''
        } ${isOpen ? 'is-open' : ''} ${
          toggleDone && task.status === 'done' ? 'is-completed' : ''
        }`}
      >
        <div className="task-item-main">
          {checkboxInside ? null : showDoneCheckbox ? (
            <input
              className="task-checkbox"
              type="checkbox"
              checked={toggleDone ? task.status === 'done' : undefined}
              aria-label={`Завершить задачу «${task.title}»`}
              onChange={() => {
                if (toggleDone) {
                  void onUpdate(task.id, {
                    status: task.status === 'done' ? 'active' : 'done',
                  })
                  return
                }

                window.setTimeout(() => void onMoveToDone(task), 350)
              }}
            />
          ) : (
            <span className="task-status-dot" aria-hidden="true">
              ✓
            </span>
          )}

          {variant === 'timeline' && task.life_area && (
            <span className="task-area-tile" aria-hidden="true">
              <LifeAreaIcon area={task.life_area} />
            </span>
          )}

          <button
            className="task-summary"
            type="button"
            onClick={() => {
              if (isSwipeJustHappened()) return

              if (isSwiped) {
                onSwipeChange(null)
                return
              }

              onToggleDetails(task.id)
            }}
            aria-expanded={isOpen}
          >
            <span className="task-title">{task.title}</span>

            {(variant === 'timeline' || cardVariant === 'todo') &&
              task.description && (
              <span className="task-description">{task.description}</span>
            )}

            {hideAreaIcon
              ? null
              : variant === 'timeline'
                ? timeRange && (
                    <span className="task-meta">
                      <Clock size={10} aria-hidden="true" />
                      {timeRange}
                    </span>
                  )
                : meta && <span className="task-meta">{meta}</span>}

            {cardVariant && task.life_area && (
              <LifeAreaTag area={task.life_area} />
            )}
          </button>

          {checkboxInside && isOpen && (
            <button
              className={`complete-button ${
                task.status === 'done' ? 'is-done' : ''
              }`}
              type="button"
              onClick={() =>
                task.status === 'done'
                  ? void onUpdate(task.id, { status: 'active' })
                  : void onMoveToDone(task)
              }
            >
              <span className="complete-circle" aria-hidden="true" />
              {task.status === 'done' ? 'Завершено' : 'Завершить'}
            </button>
          )}

          <button
            className="task-expand-button"
            type="button"
            onClick={() => onToggleDetails(task.id)}
            aria-label={
              isOpen
                ? `Свернуть задачу «${task.title}»`
                : `Открыть задачу «${task.title}»`
            }
          >
            <span className="expand-chevron" aria-hidden="true" />
          </button>
        </div>

        {isOpen && (
          <div className="task-item-expanded">
            <TaskDetails task={task} onUpdate={onUpdate} />
            {actions && <div className="task-actions">{actions}</div>}
          </div>
        )}
      </article>
    </div>
  )
}