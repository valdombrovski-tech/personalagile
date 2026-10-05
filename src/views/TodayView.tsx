import { useEffect, useState } from 'react'
import { EventTimeline } from '../components/EventTimeline'
import { TaskList } from '../components/TaskList'
import { getTodayString, getWeekDays } from '../lib/dates'
import { getOverdueTasks, isEventPast } from '../lib/taskSelectors'
import type { TaskActions, TaskSelection } from '../lib/taskViewTypes'
import type { Task } from '../lib/types'

type TodayViewProps = {
  tasks: Task[]
  selectedDate: string
  onSelectDate: (date: string) => void
  selection: TaskSelection
  actions: TaskActions
}

export function TodayView({
  tasks,
  selectedDate,
  onSelectDate,
  selection,
  actions,
}: TodayViewProps) {
  const [now, setNow] = useState(() => new Date())
  const [showEventsHint, setShowEventsHint] = useState(false)
  const [showTodoHint, setShowTodoHint] = useState(false)

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30000)

    return () => window.clearInterval(intervalId)
  }, [])

  function changeSelectedDate(days: number) {
    const date = new Date(`${selectedDate}T00:00:00`)
    date.setDate(date.getDate() + days)

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    onSelectDate(`${year}-${month}-${day}`)
  }

  const todayString = getTodayString()
  const weekDays = getWeekDays(selectedDate)

  const todayEvents = tasks
    .filter(
      (task) =>
        (task.status === 'active' || task.status === 'done') &&
        task.type === 'event' &&
        task.date === selectedDate
    )
    .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))

  const todayTasks = tasks
    .filter(
      (task) =>
        (task.status === 'active' || task.status === 'done') &&
        task.type === 'task' &&
        task.date === selectedDate
    )
    .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done'))

  const overdueTasks = selectedDate === todayString ? getOverdueTasks(tasks) : []

  const pastEventsCount = todayEvents.filter((task, index) =>
    isEventPast(task, index, todayEvents, now)
  ).length

  const doneTasksCount = todayTasks.filter(
    (task) => task.status === 'done'
  ).length

  return (
    <>
      <section className="today-view">
        <div className="week-bar">
          <div className="week-bar-top">
            <p className="week-month">
              {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
                'ru-RU',
                { month: 'long', year: 'numeric' }
              )}
            </p>

            <div className="week-bar-actions">
              {selectedDate !== todayString && (
                <button
                  className="week-today-button"
                  type="button"
                  onClick={() => onSelectDate(todayString)}
                >
                  Сегодня
                </button>
              )}

              <button
                className="icon-button"
                type="button"
                onClick={() => changeSelectedDate(-7)}
                aria-label="Предыдущая неделя"
              >
                ‹
              </button>

              <button
                className="icon-button"
                type="button"
                onClick={() => changeSelectedDate(7)}
                aria-label="Следующая неделя"
              >
                ›
              </button>
            </div>
          </div>

          <div className="week-strip">
            {weekDays.map((day) => {
              const date = new Date(`${day}T00:00:00`)
              const isSelected = day === selectedDate
              const hasTasks = tasks.some(
                (task) => task.status === 'active' && task.date === day
              )

              return (
                <button
                  key={day}
                  className={`week-day ${isSelected ? 'is-selected' : ''} ${
                    day === todayString ? 'is-today' : ''
                  }`}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectDate(day)}
                >
                  <span className="week-day-name">
                    {date.toLocaleDateString('ru-RU', { weekday: 'short' })}
                  </span>
                  <span className="week-day-number">{date.getDate()}</span>
                  <span
                    className={`week-day-dot ${hasTasks ? 'has-tasks' : ''}`}
                  />
                </button>
              )
            })}
          </div>
        </div>

        <section className="task-section">
          <div className="task-section-heading">
            <div className="heading-with-hint">
              <h3>События</h3>
              <button
                className="hint-button"
                type="button"
                aria-label="Что такое события"
                aria-expanded={showEventsHint}
                onClick={() => setShowEventsHint((current) => !current)}
              >
                ?
              </button>
            </div>
            <span>
              {pastEventsCount} из {todayEvents.length}
            </span>
          </div>

          {showEventsHint && (
            <p className="hint-popover" role="status">
              События — это дела с точной датой и временем начала. Они
              выстраиваются на таймлайне по порядку и становятся бледными,
              когда заканчиваются или когда начинается следующее событие.
            </p>
          )}

          <EventTimeline
            events={todayEvents}
            now={now}
            selection={selection}
            actions={actions}
            emptyText="На этот день событий пока нет."
            renderActions={(task) => (
              <>
                <button type="button" onClick={() => void actions.moveToInbox(task)}>
                  В Inbox
                </button>
                <button type="button" onClick={() => void actions.moveToIdeas(task)}>
                  В Ideas
                </button>
              </>
            )}
          />
        </section>

        <section className="task-section">
          <div className="task-section-heading">
            <div className="heading-with-hint">
              <h3>To-do</h3>
              <button
                className="hint-button"
                type="button"
                aria-label="Что такое задачи"
                aria-expanded={showTodoHint}
                onClick={() => setShowTodoHint((current) => !current)}
              >
                ?
              </button>
            </div>
            <span>
              {doneTasksCount} из {todayTasks.length}
            </span>
          </div>

          {showTodoHint && (
            <p className="hint-popover" role="status">
              To-do задачи — это дела без точного времени: достаточно выбрать
              день. Отмеченные остаются в списке, бледнеют и уходят вниз.
              Невыполненные задачи с прошлых дней собираются в блоке
              «Не завершено».
            </p>
          )}

          <TaskList
            tasks={todayTasks}
            selection={selection}
            actions={actions}
            emptyText="На этот день задач пока нет."
            toggleDone
            hideAreaIcon
            renderActions={(task) => (
              <>
                <button type="button" onClick={() => void actions.moveToInbox(task)}>
                  В Inbox
                </button>
                <button type="button" onClick={() => void actions.moveToIdeas(task)}>
                  В Ideas
                </button>
              </>
            )}
          />
        </section>
      </section>

      {overdueTasks.length > 0 && (
        <section className="task-section overdue-section">
          <div className="task-section-heading">
            <h3>Не завершено</h3>
            <span>{overdueTasks.length}</span>
          </div>

          <TaskList
            tasks={overdueTasks}
            selection={selection}
            actions={actions}
            emptyText=""
            renderActions={(task) => (
              <>
                <button type="button" onClick={() => void actions.moveToToday(task)}>
                  На сегодня
                </button>
                <button type="button" onClick={() => void actions.moveToInbox(task)}>
                  В Inbox
                </button>
                <button type="button" onClick={() => void actions.moveToIdeas(task)}>
                  В Ideas
                </button>
              </>
            )}
          />

          <button
            className="overdue-all-button"
            type="button"
            onClick={() => void actions.moveAllToToday(overdueTasks)}
          >
            Перенести всё на сегодня
          </button>
        </section>
      )}
    </>
  )
}
