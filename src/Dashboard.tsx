import { useEffect, useState, type ReactNode } from 'react'
import './App.css'
import { supabase } from './supabaseClient'
import { EmptyState } from './components/EmptyState'
import { LifeAreaPicker } from './components/LifeArea'
import { TaskCard } from './components/TaskCard'
import { pickerProps } from './lib/pickerProps'
import type { LifeArea, Task, View } from './lib/types'
import { getTaskType } from './lib/tasks'
import {
  formatSelectedDate,
  formatTime,
  getRelativeDayLabel,
  getTodayString,
  getWeekDays,
} from './lib/dates'

const AFFIRMATIONS = [
  'Хороший день для больших дел',
  'Маленькие шаги ведут далеко',
  'Спокойно, по одному делу за раз',
  'Главное — начать',
  'Сегодня ты на правильном пути',
  'Фокус на главном',
  'Ты справишься шаг за шагом',
  'Время делать важное',
]

function getAffirmation() {
  const now = new Date()
  const dayNumber = Math.floor(
    new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() /
      86400000
  )

  return AFFIRMATIONS[dayNumber % AFFIRMATIONS.length]
}

function Dashboard() {
  const [userEmail, setUserEmail] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDate, setNewTaskDate] = useState('')
  const [newTaskStartTime, setNewTaskStartTime] = useState('')
  const [newTaskEndTime, setNewTaskEndTime] = useState('')
  const [newTaskLifeArea, setNewTaskLifeArea] = useState<LifeArea | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [view, setView] = useState<View>('today')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(getTodayString())
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [showEventsHint, setShowEventsHint] = useState(false)
  const [showTodoHint, setShowTodoHint] = useState(false)
  const [swipedTaskId, setSwipedTaskId] = useState<string | null>(null)

  async function createTask() {
    if (!newTaskTitle.trim()) {
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Не удалось получить текущего пользователя:', userError)
      return
    }

    const isEvent = Boolean(newTaskDate) && Boolean(newTaskStartTime)

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: newTaskTitle.trim(),
        life_area: newTaskLifeArea,
        status: newTaskDate ? 'active' : 'inbox',
        type: isEvent ? 'event' : 'task',
        date: newTaskDate || null,
        start_time: isEvent ? newTaskStartTime : null,
        end_time: isEvent ? newTaskEndTime || null : null,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return
    }

    setTasks((currentTasks) => [...currentTasks, data as Task])
    setNewTaskTitle('')
    setNewTaskDate('')
    setNewTaskStartTime('')
    setNewTaskEndTime('')
    setNewTaskLifeArea(null)
    setShowCreateForm(false)
  }

  async function updateTask(taskId: string, changes: Partial<Task>) {
    const { data, error } = await supabase
      .from('tasks')
      .update(changes)
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return
    }

    setTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === taskId ? (data as Task) : task))
    )
  }

  async function moveToInProgress(task: Task) {
    const date = task.date || getTodayString()

    await updateTask(task.id, {
      status: 'active',
      date,
      type: getTaskType(date, task.start_time),
    })
  }

  async function moveToInbox(task: Task) {
    await updateTask(task.id, { status: 'inbox' })
  }

  async function moveToIdeas(task: Task) {
    await updateTask(task.id, { status: 'idea' })
  }

  async function moveToDone(task: Task) {
    await updateTask(task.id, { status: 'done' })
  }

  async function moveToToday(task: Task) {
    await updateTask(task.id, { date: getTodayString() })
  }

  async function moveAllToToday(list: Task[]) {
    await Promise.all(list.map((task) => moveToToday(task)))
  }

  async function deleteTask(taskId: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)

    if (error) {
      console.error('Supabase error:', error)
      return
    }

    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId))

    if (selectedTaskId === taskId) {
      setSelectedTaskId(null)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function loadTasks() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('Supabase error:', error)
        return
      }

      if (!isMounted) {
        return
      }

      setUserEmail(user.email ?? '')
      setTasks((data ?? []) as Task[])
    }

    void loadTasks()

    return () => {
      isMounted = false
    }
  }, [])

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

    setSelectedDate(`${year}-${month}-${day}`)
  }

  function toggleTaskDetails(taskId: string) {
    setSwipedTaskId(null)
    setSelectedTaskId((currentId) => (currentId === taskId ? null : taskId))
  }

  function getViewTitle() {
    const titles: Record<View, string> = {
      today: 'Сегодня',
      inbox: 'Входящие',
      'in-progress': 'В работе',
      ideas: 'Идеи',
      done: 'Готово',
    }

    return titles[view]
  }

  function getCardProps(task: Task) {
    return {
      task,
      isOpen: selectedTaskId === task.id,
      isSwiped: swipedTaskId === task.id,
      onToggleDetails: toggleTaskDetails,
      onSwipeChange: setSwipedTaskId,
      onUpdate: updateTask,
      onMoveToInbox: moveToInbox,
      onMoveToIdeas: moveToIdeas,
      onMoveToDone: moveToDone,
    }
  }

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
    .sort(
      (a, b) => Number(a.status === 'done') - Number(b.status === 'done')
    )

  function isEventPast(task: Task, index: number) {
    if (task.status === 'done') return true
    if (!task.date) return false

    const today = getTodayString()

    if (task.date < today) return true
    if (task.date > today) return false

    const nowTime = now.toTimeString().slice(0, 5)

    if (task.end_time && nowTime >= formatTime(task.end_time)) {
      return true
    }

    const nextEvent = todayEvents
      .slice(index + 1)
      .find(
        (event) =>
          event.start_time &&
          formatTime(event.start_time) > formatTime(task.start_time)
      )

    return Boolean(nextEvent && nowTime >= formatTime(nextEvent.start_time))
  }

  const inboxTasks = tasks.filter((task) => task.status === 'inbox')
  const ideaTasks = tasks.filter((task) => task.status === 'idea')
  const inProgressTasks = tasks.filter((task) => task.status === 'active')
  const doneTasks = tasks.filter((task) => task.status === 'done')
  const todayString = getTodayString()
  const weekDays = getWeekDays(selectedDate)

  const relativeDayLabel = getRelativeDayLabel(selectedDate)

  const headerTitle =
    view === 'today'
      ? relativeDayLabel
        ? `${relativeDayLabel}, ${formatSelectedDate(selectedDate)}`
        : formatSelectedDate(selectedDate)
      : getViewTitle()

  const headerOverdueCount =
    selectedDate === getTodayString()
      ? tasks.filter(
          (task) =>
            task.status === 'active' &&
            task.type === 'task' &&
            task.date !== null &&
            task.date < getTodayString()
        ).length
      : 0

  const headerCount =
    view === 'today'
      ? todayEvents.filter((task) => task.status === 'active').length +
        todayTasks.filter((task) => task.status === 'active').length +
        headerOverdueCount
      : view === 'inbox'
        ? inboxTasks.length
        : view === 'ideas'
          ? ideaTasks.length
          : view === 'in-progress'
            ? inProgressTasks.length
            : doneTasks.length

  const headerCountLabel = view === 'today' ? 'Запланировано' : 'Задач'

  const accountInitial = userEmail ? userEmail.charAt(0).toUpperCase() : '·'

  function renderTaskList(
    list: Task[],
    renderActions: (task: Task) => ReactNode,
    emptyText: string,
    showDoneCheckbox = true,
    toggleDone = false,
    hideAreaIcon = false
  ) {
    if (!list.length) {
      return <EmptyState text={emptyText} />
    }

    return (
      <div className="task-list">
        {list.map((task) => (
          <TaskCard
            key={task.id}
            {...getCardProps(task)}
            actions={renderActions(task)}
            showDoneCheckbox={showDoneCheckbox}
            toggleDone={toggleDone}
            hideAreaIcon={hideAreaIcon}
          />
        ))}
      </div>
    )
  }

  function renderEventTimeline(
    list: Task[],
    renderActions: (task: Task) => ReactNode,
    emptyText: string
  ) {
    if (!list.length) {
      return <EmptyState text={emptyText} />
    }

    return (
      <div className="timeline">
        {list.map((task, index) => {
          const isPast = isEventPast(task, index)

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
                {...getCardProps(task)}
                actions={renderActions(task)}
                checkboxInside
              />
            </div>
          )
        })}
      </div>
    )
  }

  const headerTitleParts = headerTitle.split(', ')

  const headerNote =
    view === 'today'
      ? getAffirmation()
      : `${headerCountLabel}: ${headerCount}`

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div className="header-copy">
          <h1>
            {headerTitleParts.map((part, index) => (
              <span className="title-line" key={part}>
                {part}
                {index < headerTitleParts.length - 1 ? ',' : ''}
              </span>
            ))}
          </h1>

          <div className="header-note">
            <p className="header-subtitle">{headerNote}</p>

            <button
              className="header-add-button"
              type="button"
              aria-label="Создать задачу"
              onClick={() => setShowCreateForm(true)}
            >
              +
            </button>
          </div>
        </div>

        <div className="account-menu">
          <button
            className="account-menu-trigger"
            type="button"
            aria-label="Открыть меню профиля"
            aria-expanded={isAccountMenuOpen}
            onClick={() => setIsAccountMenuOpen((current) => !current)}
          >
            {accountInitial}
          </button>

          {isAccountMenuOpen && (
            <div className="account-menu-panel">
              <p className="account-email">
                {userEmail || 'Загрузка профиля…'}
              </p>

              <button
                className="logout-button"
                type="button"
                onClick={() => void supabase.auth.signOut()}
              >
                Выйти из аккаунта
              </button>
            </div>
          )}
        </div>
      </header>

      {showCreateForm && (
        <div
          className="sheet-backdrop"
          onClick={() => setShowCreateForm(false)}
        >
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Новая задача"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />

            <div className="sheet-header">
              <h2>Новая задача</h2>

              <button
                className="icon-button"
                type="button"
                aria-label="Закрыть"
                onClick={() => setShowCreateForm(false)}
              >
                ✕
              </button>
            </div>

            <div className="sheet-form">
              <input
                className="creator-title"
                type="text"
                placeholder="Что нужно сделать?"
                autoFocus
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void createTask()
                  }
                }}
              />

              <button
                className="schedule-toggle"
                type="button"
                aria-expanded={showSchedule}
                onClick={() => setShowSchedule((current) => !current)}
              >
                {showSchedule ? 'Убрать дату и время' : '+ Дата и время'}
              </button>

              {showSchedule && (
                <div className="creator-schedule">
                  <label className="field-label">
                    Дата
                    <input
                      type="date"
                      {...pickerProps}
                      value={newTaskDate}
                      onChange={(event) => setNewTaskDate(event.target.value)}
                    />
                  </label>

                  <label className="field-label">
                    Начало
                    <input
                      type="time"
                      {...pickerProps}
                      value={newTaskStartTime}
                      onChange={(event) =>
                        setNewTaskStartTime(event.target.value)
                      }
                    />
                  </label>

                  <label className="field-label">
                    Конец
                    <input
                      type="time"
                      {...pickerProps}
                      value={newTaskEndTime}
                      onChange={(event) =>
                        setNewTaskEndTime(event.target.value)
                      }
                    />
                  </label>
                </div>
              )}

              <LifeAreaPicker
                value={newTaskLifeArea}
                onChange={setNewTaskLifeArea}
              />

              <p className="sheet-hint">
                {newTaskDate
                  ? 'Задача появится в плане на выбранный день'
                  : 'Без даты задача попадёт во входящие'}
              </p>

              <button
                className="primary-button"
                type="button"
                onClick={() => void createTask()}
              >
                Добавить задачу
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'today' && (
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
                    onClick={() => setSelectedDate(todayString)}
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
                    onClick={() => setSelectedDate(day)}
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
                {todayEvents.filter((task, index) => isEventPast(task, index)).length}{' '}
                из {todayEvents.length}
              </span>
            </div>

            {showEventsHint && (
              <p className="hint-popover" role="status">
                События — это дела с точной датой и временем начала.
                Они выстраиваются на таймлайне по порядку и становятся
                бледными, когда заканчиваются или когда начинается
                следующее событие.
              </p>
            )}

            {renderEventTimeline(
              todayEvents,
              (task) => (
                <>
                  <button type="button" onClick={() => void moveToInbox(task)}>
                    В Inbox
                  </button>
                  <button type="button" onClick={() => void moveToIdeas(task)}>
                    В Ideas
                  </button>
                </>
              ),
              'На этот день событий пока нет.'
            )}
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
                {todayTasks.filter((task) => task.status === 'done').length} из{' '}
                {todayTasks.length}
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

            {renderTaskList(
              todayTasks,
              (task) => (
                <>
                  <button type="button" onClick={() => void moveToInbox(task)}>
                    В Inbox
                  </button>
                  <button type="button" onClick={() => void moveToIdeas(task)}>
                    В Ideas
                  </button>
                </>
              ),
              'На этот день задач пока нет.',
              true,
              true,
              true
            )}
          </section>
        </section>
      )}

      {selectedDate === getTodayString() &&
        (() => {
          const overdue = tasks
            .filter(
              (task) =>
                task.status === 'active' &&
                task.type === 'task' &&
                task.date !== null &&
                task.date < getTodayString()
            )
            .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))

          if (!overdue.length) {
            return null
          }

          return (
            <section className="task-section overdue-section">
              <div className="task-section-heading">
                <h3>Не завершено</h3>
                <span>{overdue.length}</span>
              </div>
              {renderTaskList(
                overdue,
                (task) => (
                  <>
                    <button
                      type="button"
                      onClick={() => void moveToToday(task)}
                    >
                      На сегодня
                    </button>
                    <button
                      type="button"
                      onClick={() => void moveToInbox(task)}
                    >
                      В Inbox
                    </button>
                    <button
                      type="button"
                      onClick={() => void moveToIdeas(task)}
                    >
                      В Ideas
                    </button>
                  </>
                ),
                ''
              )}
              <button
                className="overdue-all-button"
                type="button"
                onClick={() => void moveAllToToday(overdue)}
              >
                Перенести всё на сегодня
              </button>
            </section>
          )
        })()}

      {view === 'inbox' && (
        <section className="task-section">
          <div className="task-section-heading">
            <h3>Входящие</h3>
            <span>{inboxTasks.length}</span>
          </div>

          {renderTaskList(
            inboxTasks,
            (task) => (
              <>
                <button
                  type="button"
                  onClick={() => void moveToInProgress(task)}
                >
                  В работу
                </button>
                <button type="button" onClick={() => void moveToIdeas(task)}>
                  В идеи
                </button>
                <button type="button" onClick={() => void moveToDone(task)}>
                  Готово
                </button>
              </>
            ),
            'Inbox пуст. Добавьте первую задачу.'
          )}
        </section>
      )}

      {view === 'ideas' && (
        <section className="task-section">
          <div className="task-section-heading">
            <h3>Идеи</h3>
            <span>{ideaTasks.length}</span>
          </div>

          {renderTaskList(
            ideaTasks,
            (task) => (
              <>
                <button
                  type="button"
                  onClick={() => void moveToInProgress(task)}
                >
                  В работу
                </button>
                <button type="button" onClick={() => void moveToInbox(task)}>
                  В Inbox
                </button>
                <button type="button" onClick={() => void moveToDone(task)}>
                  Готово
                </button>
              </>
            ),
            'Здесь пока нет идей.'
          )}
        </section>
      )}

      {view === 'in-progress' && (
        <section className="task-section">
          <div className="task-section-heading">
            <h3>В работе</h3>
            <span>{inProgressTasks.length}</span>
          </div>

          {renderTaskList(
            inProgressTasks,
            (task) => (
              <>
                <button type="button" onClick={() => void moveToInbox(task)}>
                  В Inbox
                </button>
                <button type="button" onClick={() => void moveToIdeas(task)}>
                  В идеи
                </button>
                <button type="button" onClick={() => void moveToDone(task)}>
                  Готово
                </button>
              </>
            ),
            'Нет задач в работе.'
          )}
        </section>
      )}

      {view === 'done' && (
        <section className="task-section">
          <div className="task-section-heading">
            <h3>Готово</h3>
            <span>{doneTasks.length}</span>
          </div>

          {renderTaskList(
            doneTasks,
            (task) => (
              <>
                <button
                  type="button"
                  onClick={() => void moveToInProgress(task)}
                >
                  Вернуть в работу
                </button>
                <button type="button" onClick={() => void moveToInbox(task)}>
                  В Inbox
                </button>
                <button
                  className="danger-button"
                  type="button"
                  onClick={() => void deleteTask(task.id)}
                >
                  Удалить
                </button>
              </>
            ),
            'Выполненных задач пока нет.',
            false
          )}
        </section>
      )}

      <nav className="bottom-nav" aria-label="Разделы приложения">
        <button
          className={view === 'today' ? 'is-active' : ''}
          type="button"
          onClick={() => setView('today')}
        >
          <span className="nav-icon">◷</span>
          <span>Сегодня</span>
        </button>

        <button
          className={view === 'inbox' ? 'is-active' : ''}
          type="button"
          onClick={() => setView('inbox')}
        >
          <span className="nav-icon">↓</span>
          <span>Inbox</span>
        </button>

        <button
          className="nav-add-button"
          type="button"
          onClick={() => setShowCreateForm(true)}
          aria-label="Создать задачу"
        >
          +
        </button>

        <button
          className={view === 'ideas' ? 'is-active' : ''}
          type="button"
          onClick={() => setView('ideas')}
        >
          <span className="nav-icon">✦</span>
          <span>Идеи</span>
        </button>

        <button
          className={view === 'in-progress' ? 'is-active' : ''}
          type="button"
          onClick={() => setView('in-progress')}
        >
          <span className="nav-icon">≡</span>
          <span>В работе</span>
        </button>
      </nav>

      <button
        className="done-link"
        type="button"
        onClick={() => setView('done')}
      >
        Посмотреть выполненные задачи
      </button>
    </main>
  )
}

export default Dashboard
