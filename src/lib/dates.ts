export function getTodayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function toDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getWeekDays(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`)
  const dayOfWeek = (date.getDay() + 6) % 7
  const monday = new Date(date)
  monday.setDate(date.getDate() - dayOfWeek)

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + index)

    return toDateString(day)
  })
}

function getDayOffset(dateString: string) {
  const selected = new Date(`${dateString}T00:00:00`)
  const today = new Date(`${getTodayString()}T00:00:00`)

  return Math.round((selected.getTime() - today.getTime()) / 86400000)
}

export function getRelativeDayLabel(dateString: string) {
  const offset = getDayOffset(dateString)

  if (offset === -2) return 'Позавчера'
  if (offset === -1) return 'Вчера'
  if (offset === 0) return 'Сегодня'
  if (offset === 1) return 'Завтра'
  if (offset === 2) return 'Послезавтра'

  return null
}

export function formatSelectedDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })
}

export function formatTime(time: string | null) {
  return time ? time.slice(0, 5) : ''
}