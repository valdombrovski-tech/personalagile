import type { ReactNode } from 'react'
import { useState } from 'react'
import { DirectPreview } from '../components/DirectPreview'
import { UserSearchSheet } from '../components/UserSearchSheet'
import { TaskList } from '../components/TaskList'
import type { TaskActions, TaskSelection } from '../lib/taskViewTypes'
import type { Task } from '../lib/types'
import { QuickAddBar } from '../components/QuickAddBar'
import { LifeAreaFilter } from '../components/LifeAreaFilter'
import { LIFE_AREAS } from "../lib/lifeAreas";

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

type InboxViewProps = ListViewProps & {
  onOpenMessages: (conversationId?: string) => void
  onQuickCreate: (
    title: string,
    kind: 'task' | 'idea'
  ) => Promise<boolean>
}

export function InboxView({
  tasks,
  selection,
  actions,
  onOpenMessages,
  onQuickCreate,
}: InboxViewProps) {
  const [isDirectNoticeVisible, setIsDirectNoticeVisible] = useState(false)
const [isUserSearchOpen, setIsUserSearchOpen] = useState(false)

  const [areaFilter, setAreaFilter] = useState<string | null>(null)

  const visibleTasks = areaFilter
    ? tasks.filter((task) => task.life_area === areaFilter)
    : tasks

  function openUserSearch() {
  setIsDirectNoticeVisible(false)
  setIsUserSearchOpen(true)
}

  return (
  <>

        <QuickAddBar onCreate={onQuickCreate} />

    <DirectPreview
  onFindUser={openUserSearch}
  onOpenMessages={onOpenMessages}
/>

      {isUserSearchOpen && (
  <UserSearchSheet onClose={() => setIsUserSearchOpen(false)} />
)}

      {isDirectNoticeVisible && (
        <p className="direct-notice" role="status">
          Поиск пользователей появится на следующем шаге.
        </p>
      )}

            <ListSection title="Мои задачи" count={visibleTasks.length}>
        <LifeAreaFilter
          areas={LIFE_AREAS}
          value={areaFilter}
          onChange={setAreaFilter}
        />

        <TaskList
          tasks={visibleTasks}
          selection={selection}
          actions={actions}
          emptyText={
            areaFilter
              ? 'В этой сфере пока нет задач.'
              : 'Inbox пуст. Добавьте первую задачу.'
          }
          renderActions={(task) => (
            <>
              <button
                type="button"
                onClick={() => void actions.moveToInProgress(task)}
              >
                В работу
              </button>
              <button
                type="button"
                onClick={() => void actions.moveToIdeas(task)}
              >
                В идеи
              </button>
              <button
                type="button"
                onClick={() => void actions.moveToDone(task)}
              >
                Готово
              </button>
            </>
          )}
        />
      </ListSection>
    </>
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
