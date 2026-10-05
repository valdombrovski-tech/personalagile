import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './supabaseClient'
import {
  CreateTaskSheet,
  type NewTaskInput,
} from './components/CreateTaskSheet'
import { TodayView } from './views/TodayView'
import {
  DoneView,
  IdeasView,
  InboxView,
  InProgressView,
} from './views/ListViews'
import type { Task, View } from './lib/types'
import { getTaskType } from './lib/tasks'
import { getOverdueTasks } from './lib/taskSelectors'
import type { TaskActions, TaskSelection } from './lib/taskViewTypes'
import {
  formatSelectedDate,
  getRelativeDayLabel,
  getTodayString,
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

const VIEW_TITLES: Record<View, string> = {
  today: 'Сегодня',
  inbox: 'Входящие',
  'in-progress': 'В работе',
  ideas: 'Идеи',
  done: 'Готово',
}

function Dashboard() {
  const [userEmail, setUserEmail] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [view, setView] = useState<View>('today')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [swipedTaskId, setSwipedTaskId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(getTodayString())
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)

  async function createTask(input: NewTaskInput) {
    if (!input.title.trim()) {
      return false
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Не удалось получить текущего пользователя:', userError)
      return false
    }

    const isEvent = Boolean(input.date) && Boolean(input.startTime)

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: input.title.trim(),
        life_area: input.lifeArea,
        status: input.date ? 'active' : 'inbox',
        type: isEvent ? 'event' : 'task',
        date: input.date || null,
        start_time: isEvent ? input.startTime : null,
        end_time: isEvent ? input.endTime || null : null,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return false
    }

    setTasks((currentTasks) => [...currentTasks, data as Task])
    return true
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

    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId)
    )

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

  function toggleTaskDetails(taskId: string) {
    setSwipedTaskId(null)
    setSelectedTaskId((currentId) => (currentId === taskId ? null : taskId))
  }

  const actions: TaskActions = {
    update: updateTask,
    moveToInProgress,
    moveToInbox,
    moveToIdeas,
    moveToDone,
    moveToToday,
    moveAllToToday,
    deleteTask,
  }

  const selection: TaskSelection = {
    selectedTaskId,
    swipedTaskId,
    onToggleDetails: toggleTaskDetails,
    onSwipeChange: setSwipedTaskId,
  }

  const inboxTasks = tasks.filter((task) => task.status === 'inbox')
  const ideaTasks = tasks.filter((task) => task.status === 'idea')
  const inProgressTasks = tasks.filter((task) => task.status === 'active')
  const doneTasks = tasks.filter((task) => task.status === 'done')

  const relativeDayLabel = getRelativeDayLabel(selectedDate)

  const headerTitle =
    view === 'today'
      ? relativeDayLabel
        ? `${relativeDayLabel}, ${formatSelectedDate(selectedDate)}`
        : formatSelectedDate(selectedDate)
      : VIEW_TITLES[view]

  const overdueCount =
    selectedDate === getTodayString() ? getOverdueTasks(tasks).length : 0

  const todayCount =
    tasks.filter(
      (task) => task.status === 'active' && task.date === selectedDate
    ).length + overdueCount

  const headerCount =
    view === 'today'
      ? todayCount
      : view === 'inbox'
        ? inboxTasks.length
        : view === 'ideas'
          ? ideaTasks.length
          : view === 'in-progress'
            ? inProgressTasks.length
            : doneTasks.length

  const headerNote =
    view === 'today' ? getAffirmation() : `Задач: ${headerCount}`

  const headerTitleParts = headerTitle.split(', ')
  const accountInitial = userEmail ? userEmail.charAt(0).toUpperCase() : '·'

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
        <CreateTaskSheet
          onClose={() => setShowCreateForm(false)}
          onCreate={createTask}
        />
      )}

      {view === 'today' && (
        <TodayView
          tasks={tasks}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          selection={selection}
          actions={actions}
        />
      )}

      {view === 'inbox' && (
        <InboxView tasks={inboxTasks} selection={selection} actions={actions} />
      )}

      {view === 'ideas' && (
        <IdeasView tasks={ideaTasks} selection={selection} actions={actions} />
      )}

      {view === 'in-progress' && (
        <InProgressView
          tasks={inProgressTasks}
          selection={selection}
          actions={actions}
        />
      )}

      {view === 'done' && (
        <DoneView tasks={doneTasks} selection={selection} actions={actions} />
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