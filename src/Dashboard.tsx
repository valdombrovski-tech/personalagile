import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './supabaseClient'

type Task = {
  id: string
  title: string
  description: string | null
  date: string | null
  status: 'inbox' | 'active' | 'idea' | 'done'
  type: 'task' | 'event'
  start_time: string | null
  end_time: string | null
}

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


function Dashboard() {
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDate, setNewTaskDate] = useState('')
  const [newTaskStartTime, setNewTaskStartTime] = useState('')
  const [newTaskEndTime, setNewTaskEndTime] = useState('')

  const [tasks, setTasks] = useState<Task[]>([])

  const [view, setView] = useState<
    'today' | 'inbox' | 'in-progress' | 'ideas' | 'done'
  >('today')

  const [selectedTaskId, setSelectedTaskId] =
    useState<string | null>(null)

  const [selectedDate, setSelectedDate] =
    useState(getTodayString())

  async function createTask() {
    if (!newTaskTitle.trim()) {
      return
    }

    const isEvent =
      Boolean(newTaskDate) &&
      Boolean(newTaskStartTime)

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: newTaskTitle.trim(),
        status: newTaskDate ? 'active' : 'inbox',
        type: isEvent ? 'event' : 'task',
        date: newTaskDate || null,
        start_time: isEvent
          ? newTaskStartTime
          : null,
        end_time: isEvent
          ? newTaskEndTime || null
          : null,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return
    }

    setTasks((currentTasks) => [
      ...currentTasks,
      data,
    ])

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
        task.id === taskId ? data : task
      )
    )
  }

  async function moveToInProgress(task: Task) {
    const date = task.date || getTodayString()

    const type = getTaskType(
      date,
      task.start_time
    )

    await updateTask(task.id, {
      status: 'active',
      date,
      type,
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
      currentTasks.filter(
        (task) => task.id !== taskId
      )
    )

    if (selectedTaskId === taskId) {
      setSelectedTaskId(null)
    }
  }

  useEffect(() => {
    let timeoutId: number

    async function loadTasks() {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')

      if (error) {
        console.error('Supabase error:', error)
        return
      }

      const today = getTodayString()

      const updatedTasks = await Promise.all(
        data.map(async (task: Task) => {
          if (
            task.type === 'task' &&
            task.status === 'active' &&
            task.date &&
            task.date < today
          ) {
            const {
              data: updatedTask,
              error: updateError,
            } = await supabase
              .from('tasks')
              .update({
                date: today,
              })
              .eq('id', task.id)
              .select()
              .single()

            if (updateError) {
              console.error(
                'Supabase error:',
                updateError
              )
              return task
            }

            return updatedTask
          }

          return task
        })
      )

      setTasks(updatedTasks)
    }

    async function checkNextDay() {
      await loadTasks()

      const now = new Date()
      const nextDay = new Date(now)

      nextDay.setHours(24, 0, 0, 0)

      const delay =
        nextDay.getTime() -
        now.getTime() +
        1000

      timeoutId = window.setTimeout(
        checkNextDay,
        delay
      )
    }

    loadTasks()
    checkNextDay()

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [])

  function changeSelectedDate(days: number) {
    const date = new Date(
      `${selectedDate}T00:00:00`
    )

    date.setDate(date.getDate() + days)

    const year = date.getFullYear()
    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0')
    const day = String(
      date.getDate()
    ).padStart(2, '0')

    setSelectedDate(
      `${year}-${month}-${day}`
    )
  }

  return (
    <div className="dashboard">
      <h1>Personal Agile</h1>

      <input
        type="text"
        placeholder="Новая задача"
        value={newTaskTitle}
        onChange={(event) =>
          setNewTaskTitle(event.target.value)
        }
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            createTask()
          }
        }}
      />

      <input
        type="date"
        value={newTaskDate}
        onChange={(event) =>
          setNewTaskDate(event.target.value)
        }
      />

      <input
        type="time"
        value={newTaskStartTime}
        onChange={(event) =>
          setNewTaskStartTime(
            event.target.value
          )
        }
      />

      <input
        type="time"
        value={newTaskEndTime}
        onChange={(event) =>
          setNewTaskEndTime(
            event.target.value
          )
        }
      />

      <button onClick={createTask}>
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

      <button
        onClick={() => changeSelectedDate(-1)}
      >
        Previous
      </button>

      <button
        onClick={() => changeSelectedDate(1)}
      >
        Next
      </button>

      {view === 'today' && (
        <>
          <h3>Events</h3>

          <div className="events-list">
            {tasks
              .filter(
                (task) =>
                  task.status === 'active' &&
                  task.type === 'event' &&
                  task.date === selectedDate
              )
              .map((task) => (
                <div key={task.id}>
                  <div>
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={async () => {
                        await moveToDone(task)
                      }}
                    />

                    <span>{task.title}</span>

                    <input
                      type="date"
                      value={task.date ?? ''}
                      onChange={async (event) => {
                        const newDate =
                          event.target.value ||
                          null

                        await updateTask(task.id, {
                          date: newDate,
                          type: getTaskType(
                            newDate,
                            task.start_time
                          ),
                        })
                      }}
                    />

                    <input
                      type="time"
                      value={
                        task.start_time ?? ''
                      }
                      onChange={async (event) => {
                        const newStartTime =
                          event.target.value ||
                          null

                        await updateTask(
                          task.id,
                          {
                            start_time:
                              newStartTime,
                            type: getTaskType(
                              task.date,
                              newStartTime
                            ),
                          }
                        )
                      }}
                    />

                    <input
                      type="time"
                      value={
                        task.end_time ?? ''
                      }
                      onChange={async (event) => {
                        await updateTask(
                          task.id,
                          {
                            end_time:
                              event.target.value ||
                              null,
                          }
                        )
                      }}
                    />

                    <button
                      onClick={() => {
                        setSelectedTaskId(
                          (currentId) =>
                            currentId === task.id
                              ? null
                              : task.id
                        )
                      }}
                    >
                      {selectedTaskId === task.id
                        ? 'Свернуть'
                        : 'Просмотреть задачу'}
                    </button>
                  </div>

                  {selectedTaskId === task.id && (
                    <div className="task-card">
                      <input
                        type="text"
                        defaultValue={
                          task.title
                        }
                        onBlur={async (event) => {
                          const newTitle =
                            event.target.value.trim()

                          if (
                            !newTitle ||
                            newTitle ===
                              task.title
                          ) {
                            event.target.value =
                              task.title
                            return
                          }

                          await updateTask(
                            task.id,
                            {
                              title: newTitle,
                            }
                          )
                        }}
                      />

                      <textarea
                        defaultValue={
                          task.description ?? ''
                        }
                        placeholder="Описание"
                        onBlur={async (event) => {
                          const newDescription =
                            event.target.value.trim()

                          await updateTask(
                            task.id,
                            {
                              description:
                                newDescription ||
                                null,
                            }
                          )
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
          </div>

          <div className="todo">
            <h3>To-do</h3>

            <div className="todo-item">
              {tasks
                .filter(
                  (task) =>
                    task.status === 'active' &&
                    task.type === 'task' &&
                    task.date === selectedDate
                )
                .map((task) => (
                  <div key={task.id}>
                    <div>
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={async () => {
                          await moveToDone(task)
                        }}
                      />

                      <span>{task.title}</span>

                      <input
                        type="date"
                        value={task.date ?? ''}
                        onChange={async (event) => {
                          const newDate =
                            event.target.value ||
                            null

                          await updateTask(
                            task.id,
                            {
                              date: newDate,
                              type: getTaskType(
                                newDate,
                                task.start_time
                              ),
                            }
                          )
                        }}
                      />

                      <input
                        type="time"
                        value={
                          task.start_time ?? ''
                        }
                        onChange={async (event) => {
                          const newStartTime =
                            event.target.value ||
                            null

                          await updateTask(
                            task.id,
                            {
                              start_time:
                                newStartTime,
                              type: getTaskType(
                                task.date,
                                newStartTime
                              ),
                            }
                          )
                        }}
                      />

                      <input
                        type="time"
                        value={
                          task.end_time ?? ''
                        }
                        onChange={async (event) => {
                          await updateTask(
                            task.id,
                            {
                              end_time:
                                event.target.value ||
                                null,
                            }
                          )
                        }}
                      />

                      <button
                        onClick={() => {
                          setSelectedTaskId(
                            (currentId) =>
                              currentId === task.id
                                ? null
                                : task.id
                          )
                        }}
                      >
                        {selectedTaskId === task.id
                          ? 'Свернуть'
                          : 'Просмотреть задачу'}
                      </button>
                    </div>

                    {selectedTaskId === task.id && (
                      <div className="task-card">
                        <input
                          type="text"
                          defaultValue={
                            task.title
                          }
                          onBlur={async (event) => {
                            const newTitle =
                              event.target.value.trim()

                            if (
                              !newTitle ||
                              newTitle ===
                                task.title
                            ) {
                              event.target.value =
                                task.title
                              return
                            }

                            await updateTask(
                              task.id,
                              {
                                title: newTitle,
                              }
                            )
                          }}
                        />

                        <textarea
                          defaultValue={
                            task.description ?? ''
                          }
                          placeholder="Описание"
                          onBlur={async (event) => {
                            const newDescription =
                              event.target.value.trim()

                            await updateTask(
                              task.id,
                              {
                                description:
                                  newDescription ||
                                  null,
                              }
                            )
                          }}
                        />
                      </div>
                    )}
                  </div>
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
              .filter(
                (task) => task.status === 'inbox'
              )
              .map((task) => (
                <div key={task.id}>
                  <div>
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={async () => {
                        await moveToDone(task)
                      }}
                    />

                    <span>{task.title}</span>

                    <input
                      type="date"
                      value={task.date ?? ''}
                      onChange={async (event) => {
                        await updateTask(
                          task.id,
                          {
                            date:
                              event.target.value ||
                              null,
                          }
                        )
                      }}
                    />

                    <input
                      type="time"
                      value={
                        task.start_time ?? ''
                      }
                      onChange={async (event) => {
                        await updateTask(
                          task.id,
                          {
                            start_time:
                              event.target.value ||
                              null,
                            type: getTaskType(
                              task.date,
                              event.target.value ||
                                null
                            ),
                          }
                        )
                      }}
                    />

                    <input
                      type="time"
                      value={
                        task.end_time ?? ''
                      }
                      onChange={async (event) => {
                        await updateTask(
                          task.id,
                          {
                            end_time:
                              event.target.value ||
                              null,
                          }
                        )
                      }}
                    />

                    <button
                      onClick={() => {
                        setSelectedTaskId(
                          (currentId) =>
                            currentId === task.id
                              ? null
                              : task.id
                        )
                      }}
                    >
                      {selectedTaskId === task.id
                        ? 'Свернуть'
                        : 'Просмотреть задачу'}
                    </button>

                    <button
                      onClick={async () => {
                        await moveToInProgress(task)
                      }}
                    >
                      В In Progress
                    </button>

                    <button
                      onClick={async () => {
                        await moveToIdeas(task)
                      }}
                    >
                      В Ideas
                    </button>

                    <button
                      onClick={async () => {
                        await moveToDone(task)
                      }}
                    >
                      В Done
                    </button>
                  </div>

                  {selectedTaskId === task.id && (
                    <div className="task-card">
                      <input
                        type="text"
                        defaultValue={
                          task.title
                        }
                        onBlur={async (event) => {
                          const newTitle =
                            event.target.value.trim()

                          if (
                            !newTitle ||
                            newTitle ===
                              task.title
                          ) {
                            event.target.value =
                              task.title
                            return
                          }

                          await updateTask(
                            task.id,
                            {
                              title: newTitle,
                            }
                          )
                        }}
                      />

                      <textarea
                        defaultValue={
                          task.description ?? ''
                        }
                        placeholder="Описание"
                        onBlur={async (event) => {
                          const newDescription =
                            event.target.value.trim()

                          await updateTask(
                            task.id,
                            {
                              description:
                                newDescription ||
                                null,
                            }
                          )
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {view === 'ideas' && (
        <div className="ideas">
          <h3>Ideas</h3>

          <div className="ideas-item">
            {tasks
              .filter(
                (task) => task.status === 'idea'
              )
              .map((task) => (
                <div key={task.id}>
                  <div>
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={async () => {
                        await moveToDone(task)
                      }}
                    />

                    <span>{task.title}</span>

                    <input
                      type="date"
                      value={task.date ?? ''}
                      onChange={async (event) => {
                        await updateTask(
                          task.id,
                          {
                            date:
                              event.target.value ||
                              null,
                          }
                        )
                      }}
                    />

                    <input
                      type="time"
                      value={
                        task.start_time ?? ''
                      }
                      onChange={async (event) => {
                        await updateTask(
                          task.id,
                          {
                            start_time:
                              event.target.value ||
                              null,
                            type: getTaskType(
                              task.date,
                              event.target.value ||
                                null
                            ),
                          }
                        )
                      }}
                    />

                    <input
                      type="time"
                      value={
                        task.end_time ?? ''
                      }
                      onChange={async (event) => {
                        await updateTask(
                          task.id,
                          {
                            end_time:
                              event.target.value ||
                              null,
                          }
                        )
                      }}
                    />

                    <button
                      onClick={() => {
                        setSelectedTaskId(
                          (currentId) =>
                            currentId === task.id
                              ? null
                              : task.id
                        )
                      }}
                    >
                      {selectedTaskId === task.id
                        ? 'Свернуть'
                        : 'Просмотреть задачу'}
                    </button>

                    <button
                      onClick={async () => {
                        await moveToInProgress(task)
                      }}
                    >
                      В In Progress
                    </button>

                    <button
                      onClick={async () => {
                        await moveToInbox(task)
                      }}
                    >
                      В Inbox
                    </button>

                    <button
                      onClick={async () => {
                        await moveToDone(task)
                      }}
                    >
                      В Done
                    </button>
                  </div>

                  {selectedTaskId === task.id && (
                    <div className="task-card">
                      <input
                        type="text"
                        defaultValue={
                          task.title
                        }
                        onBlur={async (event) => {
                          const newTitle =
                            event.target.value.trim()

                          if (
                            !newTitle ||
                            newTitle ===
                              task.title
                          ) {
                            event.target.value =
                              task.title
                            return
                          }

                          await updateTask(
                            task.id,
                            {
                              title: newTitle,
                            }
                          )
                        }}
                      />

                      <textarea
                        defaultValue={
                          task.description ?? ''
                        }
                        placeholder="Описание"
                        onBlur={async (event) => {
                          const newDescription =
                            event.target.value.trim()

                          await updateTask(
                            task.id,
                            {
                              description:
                                newDescription ||
                                null,
                            }
                          )
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {view === 'in-progress' && (
        <div className="in-progress">
          <h3>In Progress</h3>

          <div className="in-progress-item">
            {tasks
              .filter(
                (task) => task.status === 'active'
              )
              .map((task) => (
                <div key={task.id}>
                  <div>
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={async () => {
                        await moveToDone(task)
                      }}
                    />

                    <span>{task.title}</span>

                    <input
                      type="date"
                      value={task.date ?? ''}
                      onChange={async (event) => {
                        const newDate =
                          event.target.value ||
                          null

                        await updateTask(
                          task.id,
                          {
                            date: newDate,
                            type: getTaskType(
                              newDate,
                              task.start_time
                            ),
                          }
                        )
                      }}
                    />

                    <input
                      type="time"
                      value={
                        task.start_time ?? ''
                      }
                      onChange={async (event) => {
                        const newStartTime =
                          event.target.value ||
                          null

                        await updateTask(
                          task.id,
                          {
                            start_time:
                              newStartTime,
                            type: getTaskType(
                              task.date,
                              newStartTime
                            ),
                          }
                        )
                      }}
                    />

                    <input
                      type="time"
                      value={
                        task.end_time ?? ''
                      }
                      onChange={async (event) => {
                        await updateTask(
                          task.id,
                          {
                            end_time:
                              event.target.value ||
                              null,
                          }
                        )
                      }}
                    />

                    <button
                      onClick={() => {
                        setSelectedTaskId(
                          (currentId) =>
                            currentId === task.id
                              ? null
                              : task.id
                        )
                      }}
                    >
                      {selectedTaskId === task.id
                        ? 'Свернуть'
                        : 'Просмотреть задачу'}
                    </button>

                    <button
                      onClick={async () => {
                        await moveToInbox(task)
                      }}
                    >
                      В Inbox
                    </button>

                    <button
                      onClick={async () => {
                        await moveToIdeas(task)
                      }}
                    >
                      В Ideas
                    </button>

                    <button
                      onClick={async () => {
                        await moveToDone(task)
                      }}
                    >
                      В Done
                    </button>
                  </div>

                  {selectedTaskId === task.id && (
                    <div className="task-card">
                      <input
                        type="text"
                        defaultValue={
                          task.title
                        }
                        onBlur={async (event) => {
                          const newTitle =
                            event.target.value.trim()

                          if (
                            !newTitle ||
                            newTitle ===
                              task.title
                          ) {
                            event.target.value =
                              task.title
                            return
                          }

                          await updateTask(
                            task.id,
                            {
                              title: newTitle,
                            }
                          )
                        }}
                      />

                      <textarea
                        defaultValue={
                          task.description ?? ''
                        }
                        placeholder="Описание"
                        onBlur={async (event) => {
                          const newDescription =
                            event.target.value.trim()

                          await updateTask(
                            task.id,
                            {
                              description:
                                newDescription ||
                                null,
                            }
                          )
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {view === 'done' && (
        <div className="done">
          <h3>Done</h3>

          <div className="done-item">
            {tasks
              .filter(
                (task) => task.status === 'done'
              )
              .map((task) => (
                <div key={task.id}>
                  <div>
                    <span>{task.title}</span>

                    <input
                      type="date"
                      value={task.date ?? ''}
                      onChange={async (event) => {
                        const newDate =
                          event.target.value ||
                          null

                        await updateTask(
                          task.id,
                          {
                            date: newDate,
                            type: getTaskType(
                              newDate,
                              task.start_time
                            ),
                          }
                        )
                      }}
                    />

                    <input
                      type="time"
                      value={
                        task.start_time ?? ''
                      }
                      onChange={async (event) => {
                        const newStartTime =
                          event.target.value ||
                          null

                        await updateTask(
                          task.id,
                          {
                            start_time:
                              newStartTime,
                            type: getTaskType(
                              task.date,
                              newStartTime
                            ),
                          }
                        )
                      }}
                    />

                    <input
                      type="time"
                      value={
                        task.end_time ?? ''
                      }
                      onChange={async (event) => {
                        await updateTask(
                          task.id,
                          {
                            end_time:
                              event.target.value ||
                              null,
                          }
                        )
                      }}
                    />

                    <button
                      onClick={() => {
                        setSelectedTaskId(
                          (currentId) =>
                            currentId === task.id
                              ? null
                              : task.id
                        )
                      }}
                    >
                      {selectedTaskId === task.id
                        ? 'Свернуть'
                        : 'Просмотреть задачу'}
                    </button>

                    <button
                      onClick={async () => {
                        await moveToInProgress(task)
                      }}
                    >
                      В In Progress
                    </button>

                    <button
                      onClick={async () => {
                        await moveToInbox(task)
                      }}
                    >
                      В Inbox
                    </button>

                    <button
                      onClick={async () => {
                        await deleteTask(task.id)
                      }}
                    >
                      Удалить совсем
                    </button>
                  </div>

                  {selectedTaskId === task.id && (
                    <div className="task-card">
                      <input
                        type="text"
                        defaultValue={
                          task.title
                        }
                        onBlur={async (event) => {
                          const newTitle =
                            event.target.value.trim()

                          if (
                            !newTitle ||
                            newTitle ===
                              task.title
                          ) {
                            event.target.value =
                              task.title
                            return
                          }

                          await updateTask(
                            task.id,
                            {
                              title: newTitle,
                            }
                          )
                        }}
                      />

                      <textarea
                        defaultValue={
                          task.description ?? ''
                        }
                        placeholder="Описание"
                        onBlur={async (event) => {
                          const newDescription =
                            event.target.value.trim()

                          await updateTask(
                            task.id,
                            {
                              description:
                                newDescription ||
                                null,
                            }
                          )
                        }}
                      />

                      <button
                        onClick={() => {
                          setSelectedTaskId(null)
                        }}
                      >
                        Свернуть
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setView('today')}
      >
        Today
      </button>

      <button
        onClick={() => setView('inbox')}
      >
        Inbox
      </button>

      <button
        onClick={() =>
          setView('in-progress')
        }
      >
        In Progress
      </button>

      <button
        onClick={() => setView('ideas')}
      >
        Ideas
      </button>

      <button
        onClick={() => setView('done')}
      >
        Done
      </button>
    </div>
  )
}

export default Dashboard