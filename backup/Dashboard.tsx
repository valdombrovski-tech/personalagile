import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './supabaseClient'

type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  date: string | null
  status: 'inbox' | 'active' | 'idea' | 'done'
  type: 'task' | 'event'
  start_time: string | null
  end_time: string | null
}

type View = 'today' | 'inbox' | 'in-progress' | 'ideas' | 'done'

function getTodayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getTaskType(
  date: string | null,
  startTime: string | null
): Task['type'] {
  return date && startTime ? 'event' : 'task'
}

function formatTime(time: string | null) {
  return time ? time.slice(0, 5) : ''
}

function Dashboard() {
  const [userEmail, setUserEmail] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDate, setNewTaskDate] = useState('')
  const [newTaskStartTime, setNewTaskStartTime] = useState('')
  const [newTaskEndTime, setNewTaskEndTime] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [view, setView] = useState<View>('today')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(getTodayString())

  async function createTask() {
    if (!newTaskTitle.trim()) {
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error(
        'Не удалось получить текущего пользователя:',
        userError
      )
      return
    }

    const isEvent =
      Boolean(newTaskDate) && Boolean(newTaskStartTime)

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: newTaskTitle.trim(),
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
  }

  async function updateTask(
    taskId: string,
    changes: Partial<Task>
  ) {
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
      currentTasks.map((task) =>
        task.id === taskId ? (data as Task) : task
      )
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
    await updateTask(task.id, {
      status: 'inbox',
    })
  }

  async function moveToIdeas(task: Task) {
    await updateTask(task.id, {
      status: 'idea',
    })
  }

  async function moveToDone(task: Task) {
    await updateTask(task.id, {
      status: 'done',
    })
  }

  async function deleteTask(taskId: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

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

  function changeSelectedDate(days: number) {
    const date = new Date(`${selectedDate}T00:00:00`)
    date.setDate(date.getDate() + days)

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    setSelectedDate(`${year}-${month}-${day}`)
  }

  function toggleTaskDetails(taskId: string) {
    setSelectedTaskId((currentId) =>
      currentId === taskId ? null : taskId
    )
  }

  function TaskDetails({ task }: { task: Task }) {
    return (
      <div className="task-card">
        <input
          type="text"
          defaultValue={task.title}
          onBlur={(event) => {
            const newTitle = event.target.value.trim()

            if (!newTitle || newTitle === task.title) {
              event.target.value = task.title
              return
            }

            void updateTask(task.id, { title: newTitle })
          }}
        />

        <textarea
          defaultValue={task.description ?? ''}
          placeholder="Описание"
          onBlur={(event) => {
            const newDescription = event.target.value.trim()

            void updateTask(task.id, {
              description: newDescription || null,
            })
          }}
        />
      </div>
    )
  }

  function DateAndTimeFields({ task }: { task: Task }) {
    return (
      <>
        <input
          type="date"
          value={task.date ?? ''}
          onChange={(event) => {
            const newDate = event.target.value || null

            void updateTask(task.id, {
              date: newDate,
              type: getTaskType(newDate, task.start_time),
            })
          }}
        />

        <input
          type="time"
          value={formatTime(task.start_time)}
          onChange={(event) => {
            const newStartTime = event.target.value || null

            void updateTask(task.id, {
              start_time: newStartTime,
              type: getTaskType(task.date, newStartTime),
            })
          }}
        />

        <input
          type="time"
          value={formatTime(task.end_time)}
          onChange={(event) => {
            void updateTask(task.id, {
              end_time: event.target.value || null,
            })
          }}
        />
      </>
    )
  }

  function TaskRow({
    task,
    actions,
    showDoneCheckbox = true,
  }: {
    task: Task
    actions?: React.ReactNode
    showDoneCheckbox?: boolean
  }) {
    return (
      <div>
        <div>
          {showDoneCheckbox && (
            <input
              type="checkbox"
              checked={false}
              onChange={() => void moveToDone(task)}
            />
          )}

          <span>{task.title}</span>

          <DateAndTimeFields task={task} />

          <button onClick={() => toggleTaskDetails(task.id)}>
            {selectedTaskId === task.id
              ? 'Свернуть'
              : 'Просмотреть задачу'}
          </button>

          {actions}
        </div>

        {selectedTaskId === task.id && (
          <TaskDetails task={task} />
        )}
      </div>
    )
  }

  const todayEvents = tasks.filter(
    (task) =>
      task.status === 'active' &&
      task.type === 'event' &&
      task.date === selectedDate
  )

  const todayTasks = tasks.filter(
    (task) =>
      task.status === 'active' &&
      task.type === 'task' &&
      task.date === selectedDate
  )

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Personal Agile</h1>
          <p className="user-email">
            {userEmail || 'Загрузка профиля…'}
          </p>
        </div>

        <button
          className="logout-button"
          onClick={() => void supabase.auth.signOut()}
        >
          Выйти
        </button>
      </header>

      <input
        type="text"
        placeholder="Новая задача"
        value={newTaskTitle}
        onChange={(event) => setNewTaskTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            void createTask()
          }
        }}
      />

      <input
        type="date"
        value={newTaskDate}
        onChange={(event) => setNewTaskDate(event.target.value)}
      />

      <input
        type="time"
        value={newTaskStartTime}
        onChange={(event) => setNewTaskStartTime(event.target.value)}
      />

      <input
        type="time"
        value={newTaskEndTime}
        onChange={(event) => setNewTaskEndTime(event.target.value)}
      />

      <button onClick={() => void createTask()}>
        Добавить
      </button>

      <h2>
        {new Date(
          `${selectedDate}T00:00:00`
        ).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
        })}
      </h2>

      <button onClick={() => changeSelectedDate(-1)}>
        Previous
      </button>

      <button onClick={() => changeSelectedDate(1)}>
        Next
      </button>

      {view === 'today' && (
        <>
          <h3>Events</h3>

          <div className="events-list">
            {todayEvents.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                actions={
                  <>
                    <button
                      onClick={() => void moveToInbox(task)}
                    >
                      В Inbox
                    </button>

                    <button
                      onClick={() => void moveToIdeas(task)}
                    >
                      В Ideas
                    </button>
                  </>
                }
              />
            ))}
          </div>

          <div className="todo">
            <h3>To-do</h3>

            <div className="todo-item">
              {todayTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  actions={
                    <>
                      <button
                        onClick={() => void moveToInbox(task)}
                      >
                        В Inbox
                      </button>

                      <button
                        onClick={() => void moveToIdeas(task)}
                      >
                        В Ideas
                      </button>
                    </>
                  }
                />
              ))}
            </div>
          </div>
        </>
      )}

      {view === 'inbox' && (
        <div className="inbox">
          <h3>Inbox</h3>

          <div className="inbox-item">
            {tasks
              .filter((task) => task.status === 'inbox')
              .map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  actions={
                    <>
                      <button
                        onClick={() =>
                          void moveToInProgress(task)
                        }
                      >
                        В In Progress
                      </button>

                      <button
                        onClick={() => void moveToIdeas(task)}
                      >
                        В Ideas
                      </button>

                      <button
                        onClick={() => void moveToDone(task)}
                      >
                        В Done
                      </button>
                    </>
                  }
                />
              ))}
          </div>
        </div>
      )}

      {view === 'ideas' && (
        <div className="ideas">
          <h3>Ideas</h3>

          <div className="ideas-item">
            {tasks
              .filter((task) => task.status === 'idea')
              .map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  actions={
                    <>
                      <button
                        onClick={() =>
                          void moveToInProgress(task)
                        }
                      >
                        В In Progress
                      </button>

                      <button
                        onClick={() => void moveToInbox(task)}
                      >
                        В Inbox
                      </button>

                      <button
                        onClick={() => void moveToDone(task)}
                      >
                        В Done
                      </button>
                    </>
                  }
                />
              ))}
          </div>
        </div>
      )}

      {view === 'in-progress' && (
        <div className="in-progress">
          <h3>In Progress</h3>

          <div className="in-progress-item">
            {tasks
              .filter((task) => task.status === 'active')
              .map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  actions={
                    <>
                      <button
                        onClick={() => void moveToInbox(task)}
                      >
                        В Inbox
                      </button>

                      <button
                        onClick={() => void moveToIdeas(task)}
                      >
                        В Ideas
                      </button>

                      <button
                        onClick={() => void moveToDone(task)}
                      >
                        В Done
                      </button>
                    </>
                  }
                />
              ))}
          </div>
        </div>
      )}

      {view === 'done' && (
        <div className="done">
          <h3>Done</h3>

          <div className="done-item">
            {tasks
              .filter((task) => task.status === 'done')
              .map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  showDoneCheckbox={false}
                  actions={
                    <>
                      <button
                        onClick={() =>
                          void moveToInProgress(task)
                        }
                      >
                        В In Progress
                      </button>

                      <button
                        onClick={() => void moveToInbox(task)}
                      >
                        В Inbox
                      </button>

                      <button
                        onClick={() => void deleteTask(task.id)}
                      >
                        Удалить совсем
                      </button>
                    </>
                  }
                />
              ))}
          </div>
        </div>
      )}

      <button onClick={() => setView('today')}>
        Today
      </button>

      <button onClick={() => setView('inbox')}>
        Inbox
      </button>

      <button onClick={() => setView('in-progress')}>
        In Progress
      </button>

      <button onClick={() => setView('ideas')}>
        Ideas
      </button>

      <button onClick={() => setView('done')}>
        Done
      </button>
    </div>
  )
}

export default Dashboard