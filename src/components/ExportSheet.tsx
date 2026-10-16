import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import {
  createReport,
  downloadFile,
  shareFile,
  type ReadyReport,
  type ReportRange,
} from '../nutrition/exportReport'

type ExportSheetProps = {
  selectedDate: string
  ownerId?: string
  onClose: () => void
}

export function ExportSheet({
  selectedDate,
  ownerId,
  onClose,
}: ExportSheetProps) {
  const [range, setRange] = useState<ReportRange>('day')
  const [isBusy, setIsBusy] = useState(false)
  const [report, setReport] = useState<ReadyReport | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true

    return () => {
      mounted.current = false
    }
  }, [])

  function changeRange(next: ReportRange) {
    setRange(next)
    setReport(null)
    setMessage('')
    setError('')
  }

  async function prepare() {
    setIsBusy(true)
    setReport(null)
    setMessage('')
    setError('')

    try {
      const result = await createReport(
        selectedDate,
        range,
        ownerId
      )

      if (mounted.current) {
        setReport(result)
      }
    } catch (prepareError) {
      console.error('Не удалось подготовить сводку:', prepareError)

      if (mounted.current) {
        setError('Не удалось подготовить сводку. Попробуй ещё раз.')
      }
    } finally {
      if (mounted.current) {
        setIsBusy(false)
      }
    }
  }

  async function handleShare() {
    if (!report) return

    setMessage('')
    setError('')

    try {
      const outcome = await shareFile(report.file, report.title)

      if (outcome === 'unsupported') {
        downloadFile(report.file)
        setMessage('Отправка файлов здесь недоступна, PDF скачан.')
      }
    } catch (shareError) {
      console.error('Ошибка отправки:', shareError)
      setError('Не удалось открыть окно отправки.')
    }
  }

  async function handleCopy() {
    if (!report) return

    setMessage('')
    setError('')

    try {
      await navigator.clipboard.writeText(report.text)
      setMessage('Текст скопирован.')
    } catch (copyError) {
      console.error('Ошибка копирования:', copyError)
      setError('Не удалось скопировать текст.')
    }
  }

  return (
    <div className="nutrition-sheet-backdrop" onClick={onClose}>
      <div
        className="nutrition-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Сводка для нутрициолога"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="nutrition-sheet-header">
          <h3>Сводка для нутрициолога</h3>

          <button type="button" aria-label="Закрыть" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="nutrition-sheet-body">
          <div className="nutrition-range" role="group" aria-label="Период">
            <button
              type="button"
              className="nutrition-range-option"
              aria-pressed={range === 'day'}
              disabled={isBusy}
              onClick={() => changeRange('day')}
            >
              Выбранный день
            </button>

            <button
              type="button"
              className="nutrition-range-option"
              aria-pressed={range === 'week'}
              disabled={isBusy}
              onClick={() => changeRange('week')}
            >
              Последние 7 дней
            </button>
          </div>

          <button
            className="nutrition-primary"
            type="button"
            disabled={isBusy}
            onClick={() => void prepare()}
          >
            {isBusy
              ? 'Готовим…'
              : report
                ? 'Подготовить заново'
                : 'Подготовить сводку'}
          </button>

          {report && (
            <div className="nutrition-sheet-actions">
              <button
                className="nutrition-primary"
                type="button"
                onClick={() => void handleShare()}
              >
                Поделиться
              </button>

              <button
                className="nutrition-secondary"
                type="button"
                onClick={() => downloadFile(report.file)}
              >
                Скачать PDF
              </button>

              <button
                className="nutrition-secondary"
                type="button"
                onClick={() => void handleCopy()}
              >
                Скопировать текстом
              </button>
            </div>
          )}

          {message && (
            <p className="nutrition-lookup-message" role="status">
              {message}
            </p>
          )}

          {error && (
            <p className="nutrition-lookup-message" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}