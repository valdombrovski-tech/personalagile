import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Plus, Sparkles } from 'lucide-react'

type QuickAddKind = 'task' | 'idea'

type QuickAddBarProps = {
  onCreate: (title: string, kind: QuickAddKind) => Promise<boolean>
}

export function QuickAddBar({ onCreate }: QuickAddBarProps) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<QuickAddKind>('task')
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const noticeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current)
      }
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const text = title.trim()

    if (!text || isSaving) return

    setIsSaving(true)
    setErrorMessage('')

    const isCreated = await onCreate(text, kind)

    setIsSaving(false)

    if (!isCreated) {
      setErrorMessage('Не удалось сохранить. Попробуйте ещё раз.')
      return
    }

    setTitle('')
    setNotice(kind === 'idea' ? 'Добавлено в Идеи' : 'Добавлено во Входящие')

    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current)
    }

    noticeTimerRef.current = window.setTimeout(() => {
      setNotice('')
      noticeTimerRef.current = null
    }, 2500)
  }

  return (
    <form className="quick-add" onSubmit={handleSubmit}>
      <div className="quick-add-bar">
        <span className="quick-add-icon" aria-hidden="true">
          <Sparkles size={20} />
        </span>

        <input
          className="quick-add-input"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Быстрая мысль…"
          aria-label="Быстрая мысль"
          maxLength={200}
          disabled={isSaving}
        />

        <button
          className="quick-add-submit"
          type="submit"
          aria-label="Создать"
          title="Создать"
          disabled={isSaving || !title.trim()}
        >
          <Plus size={20} />
        </button>
      </div>

      {title.trim() && (
        <div
          className="quick-add-kind"
          role="radiogroup"
          aria-label="Куда добавить"
        >
          <button
            type="button"
            role="radio"
            aria-checked={kind === 'task'}
            className={kind === 'task' ? 'is-active' : ''}
            onClick={() => setKind('task')}
          >
            Задача
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={kind === 'idea'}
            className={kind === 'idea' ? 'is-active' : ''}
            onClick={() => setKind('idea')}
          >
            Идея
          </button>
        </div>
      )}

      {errorMessage && (
        <p className="quick-add-error" role="alert">
          {errorMessage}
        </p>
      )}

      {notice && (
        <p className="quick-add-notice" role="status">
          {notice}
        </p>
      )}
    </form>
  )
}