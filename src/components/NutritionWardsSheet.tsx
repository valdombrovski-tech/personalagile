import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../supabaseClient'

export type NutritionWard = {
  owner_id: string
  username: string | null
  display_name: string | null
  access_level: 'view' | 'edit'
}

type NutritionWardsSheetProps = {
  onSelect: (ward: NutritionWard) => void
  onClose: () => void
}

export function NutritionWardsSheet({
  onSelect,
  onClose,
}: NutritionWardsSheetProps) {
  const [wards, setWards] = useState<NutritionWard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const { data, error: loadError } = await supabase.rpc(
          'get_nutrition_wards'
        )

        if (loadError) throw loadError
        if (!active) return

        setWards((data ?? []) as NutritionWard[])
      } catch (loadError) {
        console.error('Не удалось загрузить подопечных:', loadError)

        if (active) {
          setError('Не удалось загрузить список доступных планов.')
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="nutrition-sheet-backdrop" onClick={onClose}>
      <div
        className="nutrition-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nutrition-wards-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="nutrition-sheet-header">
          <h3 id="nutrition-wards-title">Подопечные</h3>

          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="nutrition-sheet-body">
          {isLoading ? (
            <p role="status">Загружаем планы…</p>
          ) : error ? (
            <p className="nutrition-lookup-message" role="alert">
              {error}
            </p>
          ) : wards.length === 0 ? (
            <p>
              Пока никто не предоставил тебе доступ к плану питания.
              Друг может сделать это в разделе «Питание».
            </p>
          ) : (
            <ul className="nutrition-wards-list">
              {wards.map((ward) => {
                const name =
                  ward.display_name?.trim() ||
                  (ward.username
                    ? `@${ward.username}`
                    : 'Пользователь')

                return (
                  <li key={ward.owner_id}>
                    <button
                      className="nutrition-ward-button"
                      type="button"
                      onClick={() => onSelect(ward)}
                    >
                      <span className="nutrition-ward-person">
                        <span className="nutrition-ward-name">
                          {name}
                        </span>

                        {ward.username && (
                          <span className="nutrition-ward-username">
                            @{ward.username}
                          </span>
                        )}
                      </span>

                      <span className="nutrition-ward-role">
                        {ward.access_level === 'edit'
                          ? 'Редактирование'
                          : 'Просмотр'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}