export type LifeArea =
  | 'meetings'
  | 'home'
  | 'work'
  | 'health'
  | 'shopping'
  | 'content'
  | 'sport'

export type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  date: string | null
  status: 'inbox' | 'active' | 'idea' | 'done'
  type: 'task' | 'event'
  start_time: string | null
  end_time: string | null
  life_area: LifeArea | null
}

export type View = 'today' | 'inbox' | 'in-progress' | 'ideas' | 'done'