import { LifeAreaPicker } from './LifeAreas'
import { pickerProps } from '../lib/pickerProps'
import { formatTime } from '../lib/dates'
import { getTaskType } from '../lib/tasks'
import type { Task } from '../lib/types'

type TaskDetailsProps = {
  task: Task
  onUpdate: (taskId: string, changes: Partial<Task>) => Promise<void>
}

export function TaskDetails({ task, onUpdate }: TaskDetailsProps) {
  return (
    <div className="task-details">
      <label className="field-label">
        Название
        <input
          type="text"
          defaultValue={task.title}
          onBlur={(event) => {
            const newTitle = event.target.value.trim()

            if (!newTitle || newTitle === task.title) {
              event.target.value = task.title
              return
            }

            void onUpdate(task.id, { title: newTitle })
          }}
        />
      </label>

      <label className="field-label">
        Описание
        <textarea
          defaultValue={task.description ?? ''}
          placeholder="Добавьте описание"
          onBlur={(event) => {
            const newDescription = event.target.value.trim()

            void onUpdate(task.id, {
              description: newDescription || null,
            })
          }}
        />
      </label>

      <div className="task-date-fields">
        <label className="field-label">
          Дата
          <input
            type="date"
            {...pickerProps}
            value={task.date ?? ''}
            onChange={(event) => {
              const newDate = event.target.value || null

              void onUpdate(task.id, {
                date: newDate,
                type: getTaskType(newDate, task.start_time),
              })
            }}
          />
        </label>

        <label className="field-label">
          Начало
          <input
            type="time"
            {...pickerProps}
            value={formatTime(task.start_time)}
            onChange={(event) => {
              const newStartTime = event.target.value || null

              void onUpdate(task.id, {
                start_time: newStartTime,
                type: getTaskType(task.date, newStartTime),
              })
            }}
          />
        </label>

        <label className="field-label">
          Конец
          <input
            type="time"
            {...pickerProps}
            value={formatTime(task.end_time)}
            onChange={(event) => {
              void onUpdate(task.id, {
                end_time: event.target.value || null,
              })
            }}
          />
        </label>
      </div>

      <LifeAreaPicker
        value={task.life_area}
        onChange={(value) => {
          void onUpdate(task.id, { life_area: value })
        }}
      />
    </div>
  )
}
