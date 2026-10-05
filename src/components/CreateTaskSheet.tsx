import { useState } from 'react'
import { LifeAreaPicker } from './LifeArea'
import { pickerProps } from '../lib/pickerProps'
import type { LifeArea } from '../lib/types'

export type NewTaskInput = {
  title: string
  date: string
  startTime: string
  endTime: string
  lifeArea: LifeArea | null
}

type CreateTaskSheetProps = {
  onClose: () => void
  onCreate: (input: NewTaskInput) => Promise<boolean>
}

export function CreateTaskSheet({ onClose, onCreate }: CreateTaskSheetProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [lifeArea, setLifeArea] = useState<LifeArea | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)

  async function handleSubmit() {
    if (!title.trim()) return

    const isCreated = await onCreate({
      title,
      date,
      startTime,
      endTime,
      lifeArea,
    })

    if (isCreated) {
      onClose()
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
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
            onClick={onClose}
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
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void handleSubmit()
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
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>

              <label className="field-label">
                Начало
                <input
                  type="time"
                  {...pickerProps}
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </label>

              <label className="field-label">
                Конец
                <input
                  type="time"
                  {...pickerProps}
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                />
              </label>
            </div>
          )}

          <LifeAreaPicker value={lifeArea} onChange={setLifeArea} />

          <p className="sheet-hint">
            {date
              ? 'Задача появится в плане на выбранный день'
              : 'Без даты задача попадёт во входящие'}
          </p>

          <button
            className="primary-button"
            type="button"
            onClick={() => void handleSubmit()}
          >
            Добавить задачу
          </button>
        </div>
      </div>
    </div>
  )
}
