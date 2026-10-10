import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './supabaseClient'
import {
  CreateTaskSheet,
  type NewTaskInput,
} from './components/CreateTaskSheet'
import { BottomNav } from './components/BottomNav'


import {
  ProfileSheet,
  type UserProfile,
} from './components/ProfileSheet'


import { TodayView } from './views/TodayView'
import { FriendsView } from './views/FriendsView'
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
import { MessagesView } from './views/MessagesView'
import { useUnreadMessages } from './lib/useUnreadMessages'
import { BiorhythmsView } from './views/BiorhythmsView'
import { AccountMenu } from './components/AccountMenu'
import { AccountView } from './components/AccountView'

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
    biorhythms: 'Биоритмы',
}


function Dashboard() {
    const [userEmail, setUserEmail] = useState('')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [view, setView] = useState<View>('today')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [swipedTaskId, setSwipedTaskId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(getTodayString())
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [birthDate, setBirthDate] = useState('')
  const [accountPage, setAccountPage] = useState<
    'friends' | 'messages' | 'account' | null
  >(null)


  const isFriendsPageOpen = accountPage === 'friends'
  const isMessagesPageOpen = accountPage === 'messages'
  const isAccountSettingsOpen = accountPage === 'account'
  const isAccountPageOpen = accountPage !== null
  const unreadMessages = useUnreadMessages()
  const [messagesInitialId, setMessagesInitialId] = useState<string | null>(
    null
  )


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


    const date = input.startToday ? getTodayString() : input.date
    const isEvent = Boolean(date) && Boolean(input.startTime)


    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        life_area: input.lifeArea,
        status: date ? 'active' : 'inbox',
        type: isEvent ? 'event' : 'task',
        date: date || null,
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


  async function quickCreate(title: string, kind: 'task' | 'idea') {
    const trimmedTitle = title.trim()


    if (!trimmedTitle) {
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


    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: trimmedTitle,
        status: kind === 'idea' ? 'idea' : 'inbox',
        type: 'task',
        date: null,
        start_time: null,
        end_time: null,
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


      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
                .select('id, username, display_name, birth_date')
        .eq('id', user.id)
        .maybeSingle()


      if (profileError) {
        console.error('Не удалось загрузить профиль:', profileError)
      } else {
        const loadedProfile =
          profileData ??
          ({
            id: user.id,
            username: null,
            display_name: null,
          } as UserProfile)


                setProfile(loadedProfile)
        setShowProfile(!loadedProfile.username)
        setBirthDate((profileData?.birth_date as string | null) ?? '')
      }


      setUserEmail(user.email ?? '')
      setTasks((data ?? []) as Task[])
    }


    void loadTasks()


    return () => {
      isMounted = false
    }
  }, [])


  function openFriends() {
    setAccountPage('friends')
    setSelectedTaskId(null)
    setSwipedTaskId(null)
  }

  function openAccount() {
    setAccountPage('account')
    setSelectedTaskId(null)
    setSwipedTaskId(null)
  }


  async function saveAccount(values: {
    displayName: string
    birthDate: string
  }) {
    const {
      data: { user },
    } = await supabase.auth.getUser()


    if (!user) {
      return false
    }


    const displayName = values.displayName.trim()


    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName || null,
      birth_date: values.birthDate || null,
    })


    if (error) {
      console.error('Не удалось сохранить профиль:', error)
      return false
    }


    setBirthDate(values.birthDate)
    setProfile((current) =>
      current ? { ...current, display_name: displayName || null } : current
    )


    return true
  }

  function openMessages(conversationId?: string) {
    setMessagesInitialId(conversationId ?? null)
    setAccountPage('messages')
    setSelectedTaskId(null)
    setSwipedTaskId(null)
  }


  function toggleTaskDetails(taskId: string) {
    setSwipedTaskId(null)
    setSelectedTaskId((currentId) => (currentId === taskId ? null : taskId))
  }


  const activeView = isAccountPageOpen ? null : view


  function goToView(nextView: View) {
    setView(nextView)
    setAccountPage(null)
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


    const headerTitle = isAccountSettingsOpen
    ? 'Мой аккаунт'
    : isFriendsPageOpen
    ? 'Друзья'
    : isMessagesPageOpen
      ? 'Сообщения'
      : view === 'today'
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


    const headerNote = isAccountSettingsOpen
    ? 'Личные данные'
    : isFriendsPageOpen
    ? 'Ваш круг общения'
    : isMessagesPageOpen
      ? 'Личные диалоги'
            : view === 'today'
        ? getAffirmation()
        : view === 'biorhythms'
          ? 'Ваш ритм энергии'
          : `Задач: ${headerCount}`


  const headerTitleParts = headerTitle.split(', ')


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


                        {!isAccountPageOpen &&
              view !== 'inbox' &&
              view !== 'biorhythms' && (
              <button
                className="header-add-button"
                type="button"
                aria-label="Создать задачу"
                onClick={() => setShowCreateForm(true)}
              >
                +
              </button>
            )}
          </div>
        </div>


                <AccountMenu
          userEmail={userEmail}
          unreadMessages={unreadMessages}
                    onOpenAccount={openAccount}
          onOpenFriends={openFriends}
          onOpenMessages={() => openMessages()}
          onSignOut={() => void supabase.auth.signOut()}
        />
      </header>


      {showCreateForm && (
        <CreateTaskSheet
          onClose={() => setShowCreateForm(false)}
          onCreate={createTask}
        />
      )}


      {profile && showProfile && (
        <ProfileSheet
          profile={profile}
          required={!profile.username}
          onClose={() => setShowProfile(false)}
          onSaved={(savedProfile) => setProfile(savedProfile)}
        />
      )}


      {isFriendsPageOpen && (
        <FriendsView onBack={() => setAccountPage(null)} />
      )}

      {isAccountSettingsOpen && (
        <AccountView
          key={profile?.id ?? 'loading'}
          email={userEmail}
          username={profile?.username ?? null}
          displayName={profile?.display_name ?? null}
          birthDate={birthDate}
          onSave={saveAccount}
          onBack={() => setAccountPage(null)}
        />
      )}

      {isMessagesPageOpen && (
        <MessagesView
          key={messagesInitialId ?? 'list'}
          initialConversationId={messagesInitialId}
          onBack={() => setAccountPage(null)}
        />
      )}


      {!isAccountPageOpen && (
        <>
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
            <InboxView
              tasks={inboxTasks}
              selection={selection}
              actions={actions}
              onOpenMessages={openMessages}
              onQuickCreate={quickCreate}
            />
          )}


          {view === 'ideas' && (
            <IdeasView
              tasks={ideaTasks}
              selection={selection}
              actions={actions}
            />
          )}


          {view === 'in-progress' && (
            <InProgressView
              tasks={inProgressTasks}
              selection={selection}
              actions={actions}
            />
          )}


          {view === 'done' && (
            <DoneView
              tasks={doneTasks}
              selection={selection}
              actions={actions}
            />
          )}

                              {view === 'biorhythms' && <BiorhythmsView birthDate={birthDate} />}


                    {view !== 'biorhythms' && (
            <button
              className="done-link"
              type="button"
              onClick={() => goToView('done')}
            >
              Посмотреть выполненные задачи
            </button>
          )}
        </>
      )}


            <BottomNav
        activeView={activeView}
        unreadMessages={unreadMessages}
        onNavigate={goToView}
        onOpenMessages={() => openMessages()}
        onCreate={() => setShowCreateForm(true)}
      />
    </main>
  )
}


export default Dashboard