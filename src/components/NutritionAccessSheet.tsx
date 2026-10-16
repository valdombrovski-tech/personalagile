import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../supabaseClient'

type AccessLevel = 'view' | 'edit'
type AccessChoice = 'none' | AccessLevel
type AccessMap = Partial<Record<string, AccessLevel>>

type Friend = {
  friendship_id: string
  friend_id: string
  username: string | null
  display_name: string | null
}

type AccessRow = {
  recipient_id: string
  access_level: AccessLevel
}

type NutritionAccessSheetProps = {
  onClose: () => void
}

export function NutritionAccessSheet({
  onClose,
}: NutritionAccessSheetProps) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [access, setAccess] = useState<AccessMap>({})
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  const mounted = useRef(false)
  const savingLock = useRef(false)

  useEffect(() => {
    let active = true
    mounted.current = true

    async function load() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) throw authError

        if (!user) {
          throw new Error('Необходимо войти в аккаунт.')
        }

        const [friendsResult, accessResult] = await Promise.all([
          supabase.rpc('get_friends'),

          supabase
            .from('nutrition_plan_access')
            .select('recipient_id, access_level')
            .eq('owner_id', user.id),
        ])

        if (friendsResult.error) {
          throw friendsResult.error
        }

        if (accessResult.error) {
          throw accessResult.error
        }

        if (!active) return

        const nextAccess: AccessMap = {}

        for (const row of (accessResult.data ?? []) as AccessRow[]) {
          nextAccess[row.recipient_id] = row.access_level
        }

        setOwnerId(user.id)
        setFriends((friendsResult.data ?? []) as Friend[])
        setAccess(nextAccess)
      } catch (error) {
        console.error(
          'Не удалось загрузить доступ к питанию:',
          error
        )

        if (active) {
          setErrorMessage(
            'Не удалось загрузить друзей и настройки доступа. Закрой окно и попробуй снова.'
          )
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
      mounted.current = false
    }
  }, [])

  async function changeAccess(
    friend: Friend,
    next: AccessChoice
  ) {
    if (!ownerId || savingLock.current) return

    const previous: AccessChoice =
      access[friend.friend_id] ?? 'none'

    if (previous === next) return

    savingLock.current = true
    setSavingId(friend.friend_id)
    setErrorMessage('')
    setStatusMessage('')

    try {
      if (next === 'none') {
        const { data, error } = await supabase
          .from('nutrition_plan_access')
          .delete()
          .eq('owner_id', ownerId)
          .eq('recipient_id', friend.friend_id)
          .select('recipient_id')
          .single()

        if (error) throw error

        if (!data) {
          throw new Error('Разрешение не удалено.')
        }
      } else if (previous === 'none') {
        const { data, error } = await supabase
          .from('nutrition_plan_access')
          .insert({
            owner_id: ownerId,
            recipient_id: friend.friend_id,
            access_level: next,
          })
          .select('recipient_id, access_level')
          .single()

        if (error) throw error

        if (!data) {
          throw new Error('Разрешение не создано.')
        }
      } else {
        const { data, error } = await supabase
          .from('nutrition_plan_access')
          .update({ access_level: next })
          .eq('owner_id', ownerId)
          .eq('recipient_id', friend.friend_id)
          .select('recipient_id, access_level')
          .single()

        if (error) throw error

        if (!data) {
          throw new Error('Разрешение не обновлено.')
        }
      }

      if (!mounted.current) return

      setAccess((current) => {
        const updated: AccessMap = { ...current }

        if (next === 'none') {
          delete updated[friend.friend_id]
        } else {
          updated[friend.friend_id] = next
        }

        return updated
      })

      setStatusMessage('Настройка сохранена.')
    } catch (error) {
      console.error(
        'Не удалось изменить доступ к питанию:',
        error
      )

      if (mounted.current) {
        setErrorMessage(
          'Не удалось сохранить настройку. Закрой окно и открой снова, затем повтори.'
        )
      }
    } finally {
      savingLock.current = false

      if (mounted.current) {
        setSavingId(null)
      }
    }
  }

  return (
    <div
      className="nutrition-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="nutrition-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nutrition-access-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="nutrition-sheet-header">
          <h3 id="nutrition-access-title">
            Доступ к моему питанию
          </h3>

          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="nutrition-sheet-body">
          <p className="nutrition-access-description">
            Выбери, кому из друзей разрешить смотреть или
            редактировать твой план. Обратный доступ к их
            планам не выдаётся.
          </p>

          <p className="nutrition-access-description">
            «Просмотр» позволяет видеть план.
            «Редактирование» также позволяет добавлять
            продукты, менять вес, удалять и восстанавливать
            позиции.
          </p>

          {isLoading ? (
            <p role="status">
              Загружаем друзей и настройки…
            </p>
          ) : friends.length === 0 ? (
            !errorMessage && (
              <p>
                Пока нет друзей. После принятия заявки друг
                появится в этом списке.
              </p>
            )
          ) : (
            <ul className="nutrition-access-list">
              {friends.map((friend) => {
                const username = friend.username
                  ?.trim()
                  .replace(/^@+/, '')

                const name =
                  friend.display_name?.trim() ||
                  (username
                    ? `@${username}`
                    : 'Пользователь')

                return (
                  <li
                    className="nutrition-access-row"
                    key={friend.friend_id}
                  >
                    <div className="nutrition-access-person">
                      <span className="nutrition-access-name">
                        {name}
                      </span>

                      {username && (
                        <span className="nutrition-access-username">
                          @{username}
                        </span>
                      )}
                    </div>

                    <div className="nutrition-access-control">
                      <select
                        aria-label={`Доступ к питанию: ${name}`}
                        value={
                          access[friend.friend_id] ?? 'none'
                        }
                        disabled={
                          savingId !== null || !ownerId
                        }
                        onChange={(event) => {
                          const next = event.target.value

                          if (
                            next === 'none' ||
                            next === 'view' ||
                            next === 'edit'
                          ) {
                            void changeAccess(friend, next)
                          }
                        }}
                      >
                        <option value="none">
                          Нет доступа
                        </option>
                        <option value="view">
                          Просмотр
                        </option>
                        <option value="edit">
                          Редактирование
                        </option>
                      </select>

                      {savingId === friend.friend_id && (
                        <span
                          className="nutrition-access-saving"
                          role="status"
                        >
                          Сохраняем…
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {statusMessage && (
            <p
              className="nutrition-lookup-message"
              role="status"
            >
              {statusMessage}
            </p>
          )}

          {errorMessage && (
            <p
              className="nutrition-lookup-message"
              role="alert"
            >
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}