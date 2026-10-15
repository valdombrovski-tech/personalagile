import { useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import { getTodayString } from '../lib/dates'
import type { Habit, HabitLog, HabitStatus } from '../habits/types'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

type ViewMode = 'week' | 'month' | 'days30' | 'year'

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'days30', label: '30 дней' },
  { value: 'year', label: 'Год' },
]

const LEGACY_ICON_EMOJI: Record<string, string> = {
  wine: '🍷',
  water: '💧',
  sport: '💪',
  book: '📚',
}

export function getHabitEmoji(icon: string) {
  return LEGACY_ICON_EMOJI[icon] ?? (icon || '✨')
}

function formatDate(year: number, month: number, day: number) {
  return [
    String(year),
    String(month + 1).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-')
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toDateString(date: Date) {
  return formatDate(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, amount: number) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + amount
  )
}

function getDateRange(start: string, end: string) {
  const result: string[] = []
  let current = parseDate(start)
  const last = parseDate(end)

  while (current <= last) {
    result.push(toDateString(current))
    current = addDays(current, 1)
  }

  return result
}

function HabitDayIcon({
  icon,
  status,
}: {
  icon: string
  status: HabitStatus | undefined
}) {
  const stateClass =
    status === 'done'
      ? 'is-done'
      : status === 'failed'
        ? 'is-failed'
        : 'is-empty'

  return (
    <span
      className={`habit-day-emoji ${stateClass}`}
      aria-hidden="true"
    >
      {status === 'failed' ? '❌' : getHabitEmoji(icon)}
    </span>
  )
}

type HabitCardProps = {
  habit: Habit
  logs: HabitLog[]
  pendingDates: string[]
  updateHabit: (
    habitId: string,
    input: { title: string; icon: string }
  ) => Promise<boolean>
  cycleLog: (habitId: string, date: string) => Promise<void>
}

export function HabitCard({
  habit,
  logs,
  pendingDates,
  updateHabit,
  cycleLog,
}: HabitCardProps) {
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState(
    getHabitEmoji(habit.icon)
  )
  const [selectedTitle, setSelectedTitle] = useState(habit.title)
  const [isSaving, setIsSaving] = useState(false)

  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const today = getTodayString()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7

  const monthLabel = monthDate.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  })

  const navigationTitle =
    viewMode === 'week'
      ? 'Текущая неделя'
      : viewMode === 'days30'
        ? 'Последние 30 дней'
        : viewMode === 'year'
          ? String(year)
          : monthLabel

  const habitLogs = logs.filter((log) => log.habit_id === habit.id)

  const logsByDate = new Map(
    habitLogs.map((log) => [log.log_date, log.status])
  )

  let calendarCells: (string | null)[]

  if (viewMode === 'week') {
    const todayDate = parseDate(today)
    const mondayOffset = (todayDate.getDay() + 6) % 7
    const weekStart = addDays(todayDate, -mondayOffset)

    calendarCells = getDateRange(toDateString(weekStart), today)
  } else if (viewMode === 'days30') {
    const todayDate = parseDate(today)
    const thirtyDaysAgo = toDateString(addDays(todayDate, -29))

    const firstLogDate = habitLogs.reduce<string | null>(
      (first, log) =>
        !first || log.log_date < first ? log.log_date : first,
      null
    )

    const rangeStart =
      firstLogDate && firstLogDate > thirtyDaysAgo
        ? firstLogDate
        : thirtyDaysAgo

    const offset = (parseDate(rangeStart).getDay() + 6) % 7

    calendarCells = [
      ...Array(offset).fill(null),
      ...getDateRange(rangeStart, today),
    ]
  } else {
    const monthDays = Array.from(
      { length: daysInMonth },
      (_, index) => formatDate(year, month, index + 1)
    )

    calendarCells = [...Array(firstWeekday).fill(null), ...monthDays]
  }

  const yearEnd = formatDate(year, 11, 31)

  const periodDates =
    viewMode === 'year'
      ? getDateRange(
          formatDate(year, 0, 1),
          yearEnd < today ? yearEnd : today
        )
      : calendarCells.filter(
          (date): date is string => date !== null && date <= today
        )

  let statsDone = 0
  let statsFailed = 0
  let bestStreak = 0
  let currentRun = 0

  for (const date of periodDates) {
    const status = logsByDate.get(date)

    if (status === 'done') {
      statsDone += 1
      currentRun += 1
      bestStreak = Math.max(bestStreak, currentRun)
    } else {
      currentRun = 0

      if (status === 'failed') {
        statsFailed += 1
      }
    }
  }

  const statsUnmarked = periodDates.length - statsDone - statsFailed

  const ringRadius = 40
  const ringLength = 2 * Math.PI * ringRadius
  const ringTotal = periodDates.length

  const ringSegments = [
    { key: 'done', value: statsDone },
    { key: 'failed', value: statsFailed },
    { key: 'unmarked', value: statsUnmarked },
  ]

  let ringOffset = 0

  const ringArcs = ringSegments.map((segment) => {
    const length =
      ringTotal > 0 ? (segment.value / ringTotal) * ringLength : 0

    const arc = { ...segment, length, offset: ringOffset }
    ringOffset += length

    return arc
  })

  const donePercent =
    ringTotal > 0 ? Math.round((statsDone / ringTotal) * 100) : 0

  const bucketData: {
    key: string
    label: string
    done: number
    failed: number
    unmarked: number
    total: number
  }[] = []

  for (let index = 0; index < periodDates.length; index += 7) {
    const slice = periodDates.slice(index, index + 7)
    let bucketDone = 0
    let bucketFailed = 0

    for (const date of slice) {
      const status = logsByDate.get(date)

      if (status === 'done') {
        bucketDone += 1
      } else if (status === 'failed') {
        bucketFailed += 1
      }
    }

    bucketData.push({
      key: slice[0],
      label: parseDate(slice[0]).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
      }),
      done: bucketDone,
      failed: bucketFailed,
      unmarked: slice.length - bucketDone - bucketFailed,
      total: slice.length,
    })
  }

  const monthStats = Array.from({ length: 12 }, (_, monthIndex) => {
    const daysInThisMonth = new Date(year, monthIndex + 1, 0).getDate()
    const prefix = formatDate(year, monthIndex, 1).slice(0, 7)

    let doneInMonth = 0
    let failedInMonth = 0

    for (const log of habitLogs) {
      if (log.log_date.startsWith(prefix)) {
        if (log.status === 'done') {
          doneInMonth += 1
        } else if (log.status === 'failed') {
          failedInMonth += 1
        }
      }
    }

    return {
      monthIndex,
      daysInThisMonth,
      done: doneInMonth,
      failed: failedInMonth,
      label: new Date(year, monthIndex, 1).toLocaleDateString('ru-RU', {
        month: 'narrow',
      }),
      isFuture: formatDate(year, monthIndex, 1) > today,
    }
  })

  const bestMonth = monthStats.reduce<(typeof monthStats)[number] | null>(
    (best, item) =>
      item.done > 0 && (!best || item.done > best.done) ? item : best,
    null
  )

  const chartToday = parseDate(today)
  const chartMonday = addDays(
    chartToday,
    -((chartToday.getDay() + 6) % 7)
  )

  const weekChartDays = Array.from({ length: 7 }, (_, index) => {
    const date = toDateString(addDays(chartMonday, index))

    return {
      date,
      label: WEEKDAYS[index],
      status: logsByDate.get(date),
      isFuture: date > today,
    }
  })

  const todayStatus = logsByDate.get(today)

  const isTodayPending = pendingDates.includes(`${habit.id}:${today}`)

  const todayStatusLabel =
    todayStatus === 'done'
      ? 'засчитано'
      : todayStatus === 'failed'
        ? 'не засчитано'
        : 'нет данных'

  const todayNextAction =
    todayStatus === 'done'
      ? 'отметить как не засчитано'
      : todayStatus === 'failed'
        ? 'убрать отметку'
        : 'отметить как засчитано'

  const todayCaption =
    todayStatus === 'done'
      ? 'Засчитано'
      : todayStatus === 'failed'
        ? 'Пропущено'
        : 'Ожидает'

  const monthPrefix = formatDate(year, month, 1).slice(0, 7)

  const doneCount = habitLogs.filter(
    (log) =>
      log.status === 'done' &&
      log.log_date.startsWith(monthPrefix)
  ).length

  const hasChanges =
    selectedTitle.trim() !== habit.title ||
    selectedIcon.trim() !== getHabitEmoji(habit.icon)

  const canSave =
    !isSaving &&
    selectedTitle.trim().length > 0 &&
    selectedTitle.trim().length <= 100 &&
    selectedIcon.trim().length > 0 &&
    selectedIcon.trim().length <= 64 &&
    hasChanges

  function changeMonth(offset: number) {
    setMonthDate(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + offset,
          1
        )
    )
  }

  function changeYear(offset: number) {
    setMonthDate(
      (current) =>
        new Date(
          current.getFullYear() + offset,
          current.getMonth(),
          1
        )
    )
  }

  function navigatePeriod(offset: number) {
    if (viewMode === 'year') {
      changeYear(offset)
    } else {
      changeMonth(offset)
    }
  }

  function openMonthFromYear(targetMonth: number) {
    setMonthDate(new Date(year, targetMonth, 1))
    setViewMode('month')
  }

  function closeEditor() {
    setIsEditorOpen(false)
    setIsEmojiPickerOpen(false)
  }

  function toggleEditor() {
    if (isSaving) return

    if (isEditorOpen) {
      closeEditor()
      return
    }

    setSelectedTitle(habit.title)
    setSelectedIcon(getHabitEmoji(habit.icon))
    setIsEmojiPickerOpen(false)
    setIsEditorOpen(true)
  }

  async function saveHabitChanges() {
    if (!canSave) return

    setIsSaving(true)

    try {
      const isSaved = await updateHabit(habit.id, {
        title: selectedTitle.trim(),
        icon: selectedIcon.trim(),
      })

      if (isSaved) {
        closeEditor()
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="habit-calendar-card">
      <div className="habit-calendar-header">
        <div className="habit-today-control">
          <button
            className={[
              'habit-today-button',
              todayStatus === 'done' ? 'is-done' : '',
              todayStatus === 'failed' ? 'is-failed' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            type="button"
            disabled={isTodayPending}
            aria-busy={isTodayPending}
            aria-label={`Сегодня: ${todayStatusLabel}. Нажать, чтобы ${todayNextAction}`}
            title={`Сегодня: ${todayStatusLabel}`}
            onClick={() => void cycleLog(habit.id, today)}
          >
            <HabitDayIcon icon={habit.icon} status={todayStatus} />
          </button>

          <span className="habit-today-caption" aria-hidden="true">
            {todayCaption}
          </span>
        </div>

        <button
          className="habit-calendar-toggle"
          type="button"
          aria-expanded={isCalendarOpen}
          aria-controls={`habit-calendar-${habit.id}`}
          onClick={() => setIsCalendarOpen((current) => !current)}
        >
          <span className="habit-calendar-heading">
            <span className="habit-calendar-name">{habit.title}</span>

            <span>Засчитано за месяц: {doneCount}</span>
          </span>

          <ChevronRight
            size={20}
            className={`habit-calendar-chevron${
              isCalendarOpen ? ' is-open' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        <button
          className="habit-icon-edit-button"
          type="button"
          aria-label="Редактировать привычку"
          aria-expanded={isEditorOpen}
          aria-controls={`habit-icon-editor-${habit.id}`}
          disabled={isSaving}
          onClick={toggleEditor}
        >
          <Pencil size={17} aria-hidden="true" />
        </button>
      </div>

      {isEditorOpen && (
        <div
          id={`habit-icon-editor-${habit.id}`}
          className="habit-icon-editor"
        >
          <label className="habit-title-field">
            <span>Название привычки</span>

            <input
              type="text"
              value={selectedTitle}
              maxLength={100}
              disabled={isSaving}
              placeholder="Например, ежедневное чтение"
              onChange={(event) => setSelectedTitle(event.target.value)}
            />
          </label>

          <p className="habit-icon-editor-title">Emoji привычки</p>

          <div className="habit-emoji-selector">
            <button
              className="habit-emoji-trigger"
              type="button"
              disabled={isSaving}
              aria-label="Выбрать emoji привычки"
              aria-expanded={isEmojiPickerOpen}
              aria-controls={`habit-emoji-picker-${habit.id}`}
              onClick={() =>
                setIsEmojiPickerOpen((current) => !current)
              }
            >
              <span
                className="habit-emoji-trigger-symbol"
                aria-hidden="true"
              >
                {getHabitEmoji(selectedIcon)}
              </span>

              <span>Выбрать emoji</span>
            </button>

            {isEmojiPickerOpen && (
              <div
                id={`habit-emoji-picker-${habit.id}`}
                className="habit-emoji-picker-panel"
              >
                <EmojiPicker
                  width="100%"
                  height={350}
                  autoFocusSearch={false}
                  searchPlaceholder="Поиск emoji"
                  onEmojiClick={(emojiData) => {
                    setSelectedIcon(emojiData.emoji)
                    setIsEmojiPickerOpen(false)
                  }}
                />
              </div>
            )}
          </div>

          <div className="habit-icon-editor-actions">
            <button
              className="habit-icon-cancel"
              type="button"
              disabled={isSaving}
              onClick={closeEditor}
            >
              Отмена
            </button>

            <button
              className="habit-icon-save"
              type="button"
              disabled={!canSave}
              onClick={() => void saveHabitChanges()}
            >
              {isSaving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}

      <div
        id={`habit-calendar-${habit.id}`}
        className="habit-calendar-content"
        hidden={!isCalendarOpen}
      >
        <div
          className="habit-view-tabs"
          role="group"
          aria-label="Режим просмотра"
        >
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              className={`habit-view-tab${
                viewMode === mode.value ? ' is-active' : ''
              }`}
              aria-pressed={viewMode === mode.value}
              onClick={() => setViewMode(mode.value)}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="habit-calendar-navigation">
          <button
            type="button"
            disabled={viewMode !== 'month' && viewMode !== 'year'}
            aria-label={
              viewMode === 'year' ? 'Предыдущий год' : 'Предыдущий месяц'
            }
            onClick={() => navigatePeriod(-1)}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>

          <h3>{navigationTitle}</h3>

          <button
            type="button"
            disabled={viewMode !== 'month' && viewMode !== 'year'}
            aria-label={
              viewMode === 'year' ? 'Следующий год' : 'Следующий месяц'
            }
            onClick={() => navigatePeriod(1)}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>

        <div
          className="habit-stats"
          role="group"
          aria-label="Сводка за период"
        >
          <div className="habit-stat">
            <span className="habit-stat-value">{bestStreak}</span>
            <span className="habit-stat-label">Лучшая серия</span>
          </div>

          <div className="habit-stat is-done">
            <span className="habit-stat-value">{statsDone}</span>
            <span className="habit-stat-label">Засчитано</span>
          </div>

          <div className="habit-stat is-failed">
            <span className="habit-stat-value">{statsFailed}</span>
            <span className="habit-stat-label">Пропущено</span>
          </div>
        </div>

        {statsUnmarked > 0 && (
          <p className="habit-stats-note">
            Без отметки: {statsUnmarked}
          </p>
        )}

        {viewMode === 'week' && (
          <div className="habit-week-chart" aria-hidden="true">
            {weekChartDays.map((day) => {
              const barClass = day.isFuture
                ? 'is-future'
                : day.status === 'done'
                  ? 'is-done'
                  : day.status === 'failed'
                    ? 'is-failed'
                    : 'is-unmarked'

              return (
                <div className="habit-week-column" key={day.date}>
                  <div className="habit-week-bar-track">
                    <div className={`habit-week-bar ${barClass}`} />
                  </div>

                  <span
                    className={`habit-week-label${
                      day.date === today ? ' is-today' : ''
                    }`}
                  >
                    {day.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {viewMode === 'month' && (
          <div className="habit-ring-card">
            <div className="habit-ring" aria-hidden="true">
              <svg viewBox="0 0 100 100" width="100%" height="100%">
                <circle
                  className="habit-ring-track"
                  cx="50"
                  cy="50"
                  r={ringRadius}
                  fill="none"
                  strokeWidth="12"
                />

                {ringArcs
                  .filter((arc) => arc.length > 0)
                  .map((arc) => (
                    <circle
                      key={arc.key}
                      className={`habit-ring-arc is-${arc.key}`}
                      cx="50"
                      cy="50"
                      r={ringRadius}
                      fill="none"
                      strokeWidth="12"
                      strokeDasharray={`${Math.max(
                        arc.length - 1.5,
                        0.5
                      )} ${ringLength}`}
                      strokeDashoffset={-arc.offset}
                      transform="rotate(-90 50 50)"
                    />
                  ))}
              </svg>

              <div className="habit-ring-center">
                <span className="habit-ring-percent">{donePercent}%</span>
                <span className="habit-ring-caption">засчитано</span>
              </div>
            </div>

            <ul className="habit-ring-legend">
              <li>
                <span className="habit-ring-swatch is-done" />
                Засчитано
                <strong>{statsDone}</strong>
              </li>

              <li>
                <span className="habit-ring-swatch is-failed" />
                Пропущено
                <strong>{statsFailed}</strong>
              </li>

              <li>
                <span className="habit-ring-swatch is-unmarked" />
                Без отметки
                <strong>{statsUnmarked}</strong>
              </li>
            </ul>
          </div>
        )}

        {viewMode === 'days30' && (
          <div className="habit-bucket-card">
            <p className="habit-bucket-title">Динамика по 7 дней</p>

            <div className="habit-bucket-chart" aria-hidden="true">
              {bucketData.map((bucket) => (
                <div className="habit-bucket-column" key={bucket.key}>
                  <span className="habit-bucket-value">
                    {bucket.done}/{bucket.total}
                  </span>

                  <div className="habit-bucket-track">
                    <div
                      className="habit-bucket-segment is-unmarked"
                      style={{
                        height: `${(bucket.unmarked / bucket.total) * 100}%`,
                      }}
                    />
                    <div
                      className="habit-bucket-segment is-failed"
                      style={{
                        height: `${(bucket.failed / bucket.total) * 100}%`,
                      }}
                    />
                    <div
                      className="habit-bucket-segment is-done"
                      style={{
                        height: `${(bucket.done / bucket.total) * 100}%`,
                      }}
                    />
                  </div>

                  <span className="habit-bucket-label">
                    {bucket.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'year' && (
          <div className="habit-bucket-card">
            <p className="habit-bucket-title">Засчитано по месяцам</p>

            <div className="habit-year-chart" aria-hidden="true">
              {monthStats.map((item) => (
                <div
                  className={`habit-year-bar-column${
                    bestMonth?.monthIndex === item.monthIndex
                      ? ' is-best'
                      : ''
                  }`}
                  key={item.monthIndex}
                >
                  <span className="habit-year-bar-value">
                    {item.isFuture ? '\u00A0' : item.done}
                  </span>

                  <div className="habit-year-bar-track">
                    <div
                      className="habit-bucket-segment is-failed"
                      style={{
                        height: `${
                          (item.failed / item.daysInThisMonth) * 100
                        }%`,
                      }}
                    />
                    <div
                      className="habit-bucket-segment is-done"
                      style={{
                        height: `${
                          (item.done / item.daysInThisMonth) * 100
                        }%`,
                      }}
                    />
                  </div>

                  <span className="habit-year-bar-label">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {bestMonth && (
              <p className="habit-year-best">
                Лучший месяц:{' '}
                <strong>
                  {new Date(
                    year,
                    bestMonth.monthIndex,
                    1
                  ).toLocaleDateString('ru-RU', { month: 'long' })}
                </strong>{' '}
                — {bestMonth.done} дн.
              </p>
            )}
          </div>
        )}

        {viewMode === 'year' ? (
          <div className="habit-year-grid">
            {Array.from({ length: 12 }, (_, monthIndex) => {
              const monthName = new Date(
                year,
                monthIndex,
                1
              ).toLocaleDateString('ru-RU', { month: 'long' })

              const dim = new Date(year, monthIndex + 1, 0).getDate()

              const offset =
                (new Date(year, monthIndex, 1).getDay() + 6) % 7

              const slots = Array.from(
                { length: offset + dim },
                (_, index) => (index < offset ? null : index - offset + 1)
              )

              return (
                <div className="habit-year-month" key={monthIndex}>
                  <button
                    className="habit-year-month-title"
                    type="button"
                    aria-label={`Открыть ${monthName} ${year}`}
                    onClick={() => openMonthFromYear(monthIndex)}
                  >
                    {monthName}
                  </button>

                  <div className="habit-year-dots">
                    {slots.map((day, index) => {
                      if (day === null) {
                        return (
                          <span
                            className="habit-year-dot is-blank"
                            key={`blank-${index}`}
                            aria-hidden="true"
                          />
                        )
                      }

                      const date = formatDate(year, monthIndex, day)
                      const status = logsByDate.get(date)

                      const dotClass =
                        status === 'done'
                          ? 'is-done'
                          : status === 'failed'
                            ? 'is-failed'
                            : date > today
                              ? 'is-future'
                              : ''

                      const hasPrevInRow = index % 7 !== 0 && day > 1
                      const hasNextInRow =
                        (index + 1) % 7 !== 0 && day < dim

                      const prevStatus = hasPrevInRow
                        ? logsByDate.get(
                            formatDate(year, monthIndex, day - 1)
                          )
                        : undefined

                      const nextStatus = hasNextInRow
                        ? logsByDate.get(
                            formatDate(year, monthIndex, day + 1)
                          )
                        : undefined

                      const joinsPrev =
                        Boolean(status) && prevStatus === status
                      const joinsNext =
                        Boolean(status) && nextStatus === status

                      return (
                        <span
                          className={[
                            'habit-year-dot',
                            dotClass,
                            joinsPrev ? 'joins-prev' : '',
                            joinsNext ? 'joins-next' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          key={date}
                          aria-hidden="true"
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <>
            <div className="habit-calendar-weekdays">
              {WEEKDAYS.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>

            <div className="habit-calendar-grid">
              {calendarCells.map((date, index) => {
                if (date === null) {
                  return (
                    <span
                      className="habit-calendar-placeholder"
                      key={`empty-${index}`}
                      aria-hidden="true"
                    />
                  )
                }

                const day = Number(date.slice(8, 10))
                const dateLabel = parseDate(date).toLocaleDateString(
                  'ru-RU',
                  { day: 'numeric', month: 'long' }
                )
                const status = logsByDate.get(date)
                const isFuture = date > today
                const isPending = pendingDates.includes(
                  `${habit.id}:${date}`
                )

                const statusLabel =
                  status === 'done'
                    ? 'засчитано'
                    : status === 'failed'
                      ? 'не засчитано'
                      : 'нет данных'

                return (
                  <button
                    key={date}
                    type="button"
                    className={[
                      'habit-calendar-day',
                      date === today ? 'is-today' : '',
                      isFuture ? 'is-future' : '',
                      isPending ? 'is-pending' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={isFuture || isPending}
                    aria-label={`${dateLabel}: ${statusLabel}`}
                    aria-current={date === today ? 'date' : undefined}
                    aria-busy={isPending}
                    onClick={() => void cycleLog(habit.id, date)}
                  >
                    <span className="habit-calendar-number">{day}</span>

                    <HabitDayIcon icon={habit.icon} status={status} />
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div className="habit-calendar-legend">
          {viewMode === 'year' ? (
            <>
              <span>
                <span className="habit-year-dot" aria-hidden="true" />
                Нет данных
              </span>

              <span>
                <span
                  className="habit-year-dot is-done"
                  aria-hidden="true"
                />
                Засчитано
              </span>

              <span>
                <span
                  className="habit-year-dot is-failed"
                  aria-hidden="true"
                />
                Не засчитано
              </span>
            </>
          ) : (
            <>
              <span>
                <HabitDayIcon icon={habit.icon} status={undefined} />
                Нет данных
              </span>

              <span>
                <HabitDayIcon icon={habit.icon} status="done" />
                Засчитано
              </span>

              <span>
                <HabitDayIcon icon={habit.icon} status="failed" />
                Не засчитано
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}