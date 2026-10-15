import { useState } from 'react'
import EmojiPicker from 'emoji-picker-react'
import { useHabits } from '../habits/useHabits'
import { HabitCard, getHabitEmoji } from './HabitCard'
import {
  getHabitStats,
  MIN_MARKS_FOR_RATIO,
  type HabitStat,
} from '../habits/habitStats'

type HighlightTileProps = {
  tone: 'streak' | 'important' | 'best' | 'worst'
  label: string
  value: string
  stat: HabitStat | null
}

function HighlightTile({ tone, label, value, stat }: HighlightTileProps) {
  return (
        <div
      className={`habit-highlight is-${tone}`}
      title={stat ? `${label}: ${stat.habit.title}` : label}
    >
      <span className="habit-highlight-badge" aria-hidden="true">
        {stat ? getHabitEmoji(stat.habit.icon) : '—'}
      </span>

      <span className="habit-highlight-text">
        <span className="habit-highlight-label">{label}</span>
        <span className="habit-highlight-value">
          {stat ? value : '—'}
        </span>
        <span className="habit-highlight-name">
          {stat ? stat.habit.title : 'Нет данных'}
        </span>
      </span>
    </div>
  )
}

export function HabitsView() {
  const {
    habits,
    logs,
    isLoading,
    error,
    pendingDates,
    addHabit,
    updateHabit,
    cycleLog,
  } = useHabits()

  const [isCreating, setIsCreating] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newIcon, setNewIcon] = useState('✨')
  const [isNewEmojiPickerOpen, setIsNewEmojiPickerOpen] =
    useState(false)

  async function createSobrietyHabit() {
    if (isCreating) return

    setIsCreating(true)

    try {
      await addHabit({
        title: 'Трезвость',
        color: '#30a46c',
        icon: '🍷',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const canCreate =
    !isCreating &&
    newTitle.trim().length > 0 &&
    newTitle.trim().length <= 100

  function closeForm() {
    setIsFormOpen(false)
    setIsNewEmojiPickerOpen(false)
    setNewTitle('')
    setNewIcon('✨')
  }

  async function createHabit() {
    if (!canCreate) return

    setIsCreating(true)

    try {
      const isCreated = await addHabit({
        title: newTitle.trim(),
        color: '#30a46c',
        icon: newIcon,
      })

      if (isCreated) {
        closeForm()
      }
    } finally {
      setIsCreating(false)
    }
  }

  const stats = getHabitStats(habits, logs)

  const bestStreakStat = stats.reduce<HabitStat | null>(
    (best, item) =>
      item.bestStreak > 0 && (!best || item.bestStreak > best.bestStreak)
        ? item
        : best,
    null
  )

  const mostImportantStat = stats.reduce<HabitStat | null>(
    (best, item) =>
      item.marked > 0 && (!best || item.marked > best.marked)
        ? item
        : best,
    null
  )

  const ratedStats = stats.filter(
    (item) => item.marked >= MIN_MARKS_FOR_RATIO
  )

  const bestRatioStat = ratedStats.reduce<HabitStat | null>(
    (best, item) => (!best || item.ratio > best.ratio ? item : best),
    null
  )

  const worstRatioStat = ratedStats
    .filter((item) => item.failed > 0)
    .reduce<HabitStat | null>(
      (worst, item) =>
        !worst || item.ratio < worst.ratio ? item : worst,
      null
    )

  if (isLoading) {
    return (
      <section className="habit-calendar-page">
        <p>Загрузка привычек…</p>
      </section>
    )
  }

  return (
    <section className="habit-calendar-page">
      {error && (
        <p className="habit-calendar-error" role="alert">
          {error}
        </p>
      )}

      {habits.length > 0 && (
        <div className="habit-highlights">
          <HighlightTile
            tone="streak"
            label="Лучшая серия"
            value={bestStreakStat ? `${bestStreakStat.bestStreak} дн.` : ''}
            stat={bestStreakStat}
          />

          <HighlightTile
            tone="important"
            label="Самая важная"
            value={mostImportantStat ? `${mostImportantStat.marked} отм.` : ''}
            stat={mostImportantStat}
          />

          <HighlightTile
            tone="best"
            label="Лучшая"
            value={
              bestRatioStat
                ? `${Math.round(bestRatioStat.ratio * 100)}%`
                : ''
            }
            stat={bestRatioStat}
          />

          <HighlightTile
            tone="worst"
            label="Самая неудачная"
            value={
              worstRatioStat
                ? `${Math.round(worstRatioStat.ratio * 100)}%`
                : ''
            }
            stat={worstRatioStat}
          />
        </div>
      )}

      {habits.length === 0 ? (
        <div className="habit-calendar-empty">
          <h2>Трезвость</h2>

          <p>
            Создай привычку, чтобы начать отмечать дни в календаре.
          </p>

          <button
            className="habit-calendar-create"
            type="button"
            disabled={isCreating || Boolean(error)}
            onClick={() => void createSobrietyHabit()}
          >
            {isCreating
              ? 'Создаём…'
              : 'Создать привычку «Трезвость»'}
          </button>
        </div>
      ) : (
        habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            logs={logs}
            pendingDates={pendingDates}
            updateHabit={updateHabit}
            cycleLog={cycleLog}
          />
        ))
      )}

      {habits.length > 0 && !isFormOpen && (
        <button
          className="habit-calendar-create"
          type="button"
          disabled={Boolean(error)}
          onClick={() => setIsFormOpen(true)}
        >
          Новая привычка
        </button>
      )}

      {isFormOpen && (
        <div className="habit-calendar-card">
          <div className="habit-icon-editor">
            <label className="habit-title-field">
              <span>Название привычки</span>

              <input
                type="text"
                value={newTitle}
                maxLength={100}
                disabled={isCreating}
                placeholder="Например, ежедневное чтение"
                autoFocus
                onChange={(event) => setNewTitle(event.target.value)}
              />
            </label>

            <p className="habit-icon-editor-title">Emoji привычки</p>

            <div className="habit-emoji-selector">
              <button
                className="habit-emoji-trigger"
                type="button"
                disabled={isCreating}
                aria-label="Выбрать emoji привычки"
                aria-expanded={isNewEmojiPickerOpen}
                onClick={() =>
                  setIsNewEmojiPickerOpen((current) => !current)
                }
              >
                <span
                  className="habit-emoji-trigger-symbol"
                  aria-hidden="true"
                >
                  {newIcon}
                </span>

                <span>Выбрать emoji</span>
              </button>

              {isNewEmojiPickerOpen && (
                <div className="habit-emoji-picker-panel">
                  <EmojiPicker
                    width="100%"
                    height={350}
                    autoFocusSearch={false}
                    searchPlaceholder="Поиск emoji"
                    onEmojiClick={(emojiData) => {
                      setNewIcon(emojiData.emoji)
                      setIsNewEmojiPickerOpen(false)
                    }}
                  />
                </div>
              )}
            </div>

            <div className="habit-icon-editor-actions">
              <button
                className="habit-icon-cancel"
                type="button"
                disabled={isCreating}
                onClick={closeForm}
              >
                Отмена
              </button>

              <button
                className="habit-icon-save"
                type="button"
                disabled={!canCreate}
                onClick={() => void createHabit()}
              >
                {isCreating ? 'Создаём…' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}