import { useState } from 'react'
import { LifeAreaPicker } from './LifeAreas'
import { ClearableField } from './ClearableField'
import { pickerProps } from '../lib/pickerProps'
import type { LifeArea } from '../lib/types'
import { getTodayString } from '../lib/dates'


export type NewTaskInput = {
  title: string
  description?: string
  date: string
  startTime: string
  endTime: string
  lifeArea: LifeArea | null
  startToday?: boolean
}


type CreateTaskSheetProps = {
  onClose: () => void
  onCreate: (input: NewTaskInput) => Promise<boolean>
}


export function CreateTaskSheet({ onClose, onCreate }: CreateTaskSheetProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [lifeArea, setLifeArea] = useState<LifeArea | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showDescription, setShowDescription] = useState(false)


  async function handleSubmit(startToday: boolean) {
    if (!title.trim()) return


    const isCreated = await onCreate({
      title,
      description,
            date: startToday ? getTodayString() : date,
      startTime,
      endTime,
      lifeArea,
      startToday,
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
                void handleSubmit(false)
              }
            }}
          />


          <div className="creator-toggles">
            <button
              className="schedule-toggle"
              type="button"
              aria-expanded={showDescription}
              onClick={() => setShowDescription((current) => !current)}
            >
              {showDescription ? 'Убрать описание' : '+ Описание'}
            </button>


            <button
              className="schedule-toggle"
              type="button"
              aria-expanded={showSchedule}
              onClick={() => setShowSchedule((current) => !current)}
            >
              {showSchedule ? 'Убрать дату и время' : '+ Дата и время'}
            </button>
          </div>


          {showDescription && (
            <label className="field-label">
              Описание
              <textarea
                value={description}
                placeholder="Добавьте описание"
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          )}


          {showSchedule && (
            <div className="creator-schedule">
              <label className="field-label">
                Дата
                <ClearableField
                  hasValue={Boolean(date)}
                  label="Очистить дату"
                  onClear={() => setDate('')}
                >
                  <input
                    type="date"
                    {...pickerProps}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </ClearableField>
              </label>


              <label className="field-label">
                Начало
                <ClearableField
                  hasValue={Boolean(startTime)}
                  label="Очистить время начала"
                  onClear={() => {
                    setStartTime('')
                    setEndTime('')
                  }}
                >
                  <input
                    type="time"
                    {...pickerProps}
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                  />
                </ClearableField>
              </label>


              <label className="field-label">
                Конец
                <ClearableField
                  hasValue={Boolean(endTime)}
                  label="Очистить время окончания"
                  onClear={() => setEndTime('')}
                >
                  <input
                    type="time"
                    {...pickerProps}
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                  />
                </ClearableField>
              </label>
            </div>
          )}


          <LifeAreaPicker value={lifeArea} onChange={setLifeArea} />


          <p className="sheet-hint">
            {date
              ? 'Задача появится в плане на выбранный день'
              : 'Без даты задача попадёт во входящие'}
          </p>


          <div className="sheet-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={!title.trim()}
              onClick={() => void handleSubmit(true)}
            >
              В работу сегодня
            </button>


            <button
              className="primary-button"
              type="button"
              disabled={!title.trim()}
              onClick={() => void handleSubmit(false)}
            >
              Добавить задачу
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}