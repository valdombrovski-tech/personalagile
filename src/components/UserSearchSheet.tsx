import { useEffect, useState } from 'react'
import { Search, UserRoundPlus, X } from 'lucide-react'
import { supabase } from '../supabaseClient'

type SearchProfile = {
  id: string
  username: string
  display_name: string | null
}

type UserSearchSheetProps = {
  onClose: () => void
}

export function UserSearchSheet({ onClose }: UserSearchSheetProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchProfile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [sendingToUserId, setSendingToUserId] = useState<string | null>(null)
const [sentToUserIds, setSentToUserIds] = useState<string[]>([])

  useEffect(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (normalizedQuery.length < 2) {
      setResults([])
      setError('')
      setIsSearching(false)
      return
    }

    let isCurrent = true

    const timeoutId = window.setTimeout(() => {
      async function searchUsers() {
        setIsSearching(true)
        setError('')

        const { data, error: searchError } = await supabase.rpc(
          'search_approved_profiles',
          { search_text: normalizedQuery }
        )

        if (!isCurrent) return

        setIsSearching(false)

        if (searchError) {
          console.error('Не удалось найти пользователей:', searchError)
          setError('Не удалось выполнить поиск. Попробуйте ещё раз.')
          setResults([])
          return
        }

        setResults((data ?? []) as SearchProfile[])
      }

      void searchUsers()
    }, 250)

    return () => {
      isCurrent = false
      window.clearTimeout(timeoutId)
    }
  }, [query])

  async function sendFriendRequest(targetUserId: string) {
    setError('')
    setSendingToUserId(targetUserId)

    const { error: requestError } = await supabase.rpc(
      'send_friend_request',
      { target_user_id: targetUserId }
    )

    setSendingToUserId(null)

    if (requestError) {
      console.error('Не удалось отправить запрос в друзья:', requestError)
      setError('Не удалось отправить запрос. Попробуйте ещё раз.')
      return
    }

    setSentToUserIds((currentIds) =>
      currentIds.includes(targetUserId)
        ? currentIds
        : [...currentIds, targetUserId]
    )
  }


  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet user-search-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Найти пользователя"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />

        <div className="sheet-header">
          <h2>Найти пользователя</h2>

          <button
            className="icon-button"
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="user-search-input-wrap">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder="Никнейм, например therevelator3"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="user-search-content">
          {query.trim().length < 2 && (
            <div className="user-search-placeholder">
              <Search size={26} aria-hidden="true" />
              <p>Введите минимум 2 символа никнейма.</p>
            </div>
          )}

          {isSearching && (
            <p className="user-search-status" role="status">
              Ищем пользователей…
            </p>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          {!isSearching &&
            !error &&
            query.trim().length >= 2 &&
            results.length === 0 && (
              <div className="user-search-placeholder">
                <UserRoundPlus size={26} aria-hidden="true" />
                <p>Никого не нашли среди одобренных пользователей.</p>
              </div>
            )}

          {!isSearching && results.length > 0 && (
            <div className="user-search-results">
              {results.map((profile) => (
                <article className="user-search-result" key={profile.id}>
                  <span className="user-search-avatar" aria-hidden="true">
                    {(profile.display_name || profile.username)
                      .charAt(0)
                      .toUpperCase()}
                  </span>

                  <div className="user-search-profile">
                    <strong>@{profile.username}</strong>
                    {profile.display_name && (
                      <span>{profile.display_name}</span>
                    )}
                  </div>

                  <button
  className="user-search-add-button"
  type="button"
  disabled={
    sendingToUserId === profile.id || sentToUserIds.includes(profile.id)
  }
  onClick={() => void sendFriendRequest(profile.id)}
>
  {sendingToUserId === profile.id
    ? 'Отправляем…'
    : sentToUserIds.includes(profile.id)
      ? 'Запрос отправлен'
      : 'Добавить'}
</button>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}