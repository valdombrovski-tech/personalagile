import type { ReactNode } from 'react'
import { TaskList } from '../components/TaskList'
import type { TaskActions, TaskSelection } from '../lib/taskViewTypes'
import type { Task } from '../lib/types'

type ListViewProps = {
  tasks: Task[]
  selection: TaskSelection
  actions: TaskActions
}

function ListSection({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <section className="task-section">
      <div className="task-section-heading">
        <h3>{title}</h3>
        <span>{count}</span>
      </div>

      {children}
    </section>
  )
}

export function InboxView({ tasks, selection, actions }: ListViewProps) {
  return (
    <ListSection title="Входящие" count={tasks.length}>
      <TaskList
        tasks={tasks}
        selection={selection}
        actions={actions}
        emptyText="Inbox пуст. Добавьте первую задачу."
        renderActions={(task) => (
          <>
            <button type="button" onClick={() => void actions.moveToInProgress(task)}>
              В работу
            </button>
            <button type="button" onClick={() => void actions.moveToIdeas(task)}>
              В идеи
            </button>
            <button type="button" onClick={() => void actions.moveToDone(task)}>
              Готово
            </button>
          </>
        )}
      />
    </ListSection>
  )
}

export function IdeasView({ tasks, selection, actions }: ListViewProps) {
  return (
    <ListSection title="Идеи" count={tasks.length}>
      <TaskList
        tasks={tasks}
        selection={selection}
        actions={actions}
        emptyText="Здесь пока нет идей."
        renderActions={(task) => (
          <>
            <button type="button" onClick={() => void actions.moveToInProgress(task)}>
              В работу
            </button>
            <button type="button" onClick={() => void actions.moveToInbox(task)}>
              В Inbox
            </button>
            <button type="button" onClick={() => void actions.moveToDone(task)}>
              Готово
            </button>
          </>
        )}
      />
    </ListSection>
  )
}

export function InProgressView({ tasks, selection, actions }: ListViewProps) {
  return (
    <ListSection title="В работе" count={tasks.length}>
      <TaskList
        tasks={tasks}
        selection={selection}
        actions={actions}
        emptyText="Нет задач в работе."
        renderActions={(task) => (
          <>
            <button type="button" onClick={() => void actions.moveToInbox(task)}>
              В Inbox
            </button>
            <button type="button" onClick={() => void actions.moveToIdeas(task)}>
              В идеи
            </button>
            <button type="button" onClick={() => void actions.moveToDone(task)}>
              Готово
            </button>
          </>
        )}
      />
    </ListSection>
  )
}

export function DoneView({ tasks, selection, actions }: ListViewProps) {
  return (
    <ListSection title="Готово" count={tasks.length}>
      <TaskList
        tasks={tasks}
        selection={selection}
        actions={actions}
        emptyText="Выполненных задач пока нет."
        showDoneCheckbox={false}
        renderActions={(task) => (
          <>
            <button type="button" onClick={() => void actions.moveToInProgress(task)}>
              Вернуть в работу
            </button>
            <button type="button" onClick={() => void actions.moveToInbox(task)}>
              В Inbox
            </button>
            <button
              className="danger-button"
              type="button"
              onClick={() => void actions.deleteTask(task.id)}
            >
              Удалить
            </button>
          </>
        )}
      />
    </ListSection>
  )
}
