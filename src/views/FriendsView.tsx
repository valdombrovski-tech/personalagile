import { DirectChatView } from './DirectChatView'
import { useCallback, useEffect, useState } from 'react'
import { FriendRequests } from '../components/FriendRequests'
import { UserSearchSheet } from '../components/UserSearchSheet'
import { supabase } from '../supabaseClient'

type Friend = {
  friendship_id: string
  friend_id: string
  username: string | null
  display_name: string | null
}

type FriendsViewProps = {
  onBack: () => void
}

export function FriendsView({ onBack }: FriendsViewProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [friends, setFriends] = useState<Friend[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [openingFriendId, setOpeningFriendId] = useState<string | null>(null)
const [chatError, setChatError] = useState('')

const [activeChat, setActiveChat] = useState<{
  conversationId: string
  friendName: string
} | null>(null)

  const loadFriends = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const { data, error } = await supabase.rpc('get_friends')

      if (error) {
        console.error('Не удалось загрузить друзей:', error)
        setErrorMessage(`Не удалось загрузить друзей: ${error.message}`)
        return
      }

      setFriends((data ?? []) as Friend[])
    } catch (error) {
      console.error('Ошибка загрузки друзей:', error)
      setErrorMessage('Не удалось загрузить друзей. Проверьте соединение.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadFriends()
  }, [loadFriends])

async function openChat(friend: Friend) {
  setOpeningFriendId(friend.friend_id)
  setChatError('')

  try {
    const { data, error } = await supabase.rpc(
      'get_or_create_direct_conversation',
      { friend_id: friend.friend_id }
    )

    if (error) {
      console.error('Не удалось открыть диалог:', error)
      setChatError(error.message)
      return
    }

    if (typeof data !== 'string') {
      setChatError('Сервер не вернул ID диалога.')
      return
    }

    setActiveChat({
      conversationId: data,
      friendName:
        friend.display_name?.trim() ||
        (friend.username ? `@${friend.username}` : 'Пользователь'),
    })
  } catch (error) {
    console.error('Не удалось открыть диалог:', error)
    setChatError('Не удалось открыть диалог. Попробуйте ещё раз.')
  } finally {
    setOpeningFriendId(null)
  }
}

if (activeChat) {
  return (
    <DirectChatView
      key={activeChat.conversationId}
      conversationId={activeChat.conversationId}
      friendName={activeChat.friendName}
      onBack={() => setActiveChat(null)}
    />
  )
}

  return (
    <section className="friends-page">
      <div className="friends-page-actions">
        <button
          type="button"
          className="friends-back-button"
          onClick={onBack}
        >
          ← К задачам
        </button>

        <button
          type="button"
          className="friends-search-button"
          onClick={() => setIsSearchOpen(true)}
        >
          Найти пользователя
        </button>
      </div>

      <FriendRequests />

{chatError && (
  <p className="friends-load-error" role="alert">
    {chatError}
  </p>
)}

      <section
        className="friends-list-section"
        aria-labelledby="friends-list-title"
      >
        <div className="friends-list-heading">
          <h2 id="friends-list-title">
            Мои друзья
            {!isLoading && !errorMessage && (
              <span className="friends-list-count">
                {friends.length}
              </span>
            )}
          </h2>

          <button
            type="button"
            className="friends-refresh-button"
            disabled={isLoading}
            onClick={() => void loadFriends()}
          >
            {isLoading ? 'Загрузка…' : 'Обновить'}
          </button>
        </div>

        {isLoading ? (
          <p role="status">Загружаем друзей…</p>
        ) : errorMessage ? (
          <p className="friends-load-error" role="alert">
            {errorMessage}
          </p>
        ) : friends.length === 0 ? (
          <p>
            Пока нет друзей. Найдите пользователя и отправьте заявку.
            После принятия он появится здесь.
          </p>
        ) : (
          <ul className="friends-list">
            {friends.map((friend) => {
              const name =
                friend.display_name?.trim() ||
                (friend.username ? `@${friend.username}` : 'Пользователь')

              const avatarLetter = (
                friend.display_name?.trim() ||
                friend.username ||
                '?'
              ).charAt(0).toUpperCase()

              return (
                <li
                  className="friends-list-item"
                  key={friend.friendship_id}
                >
                  <span className="friends-avatar" aria-hidden="true">
                    {avatarLetter}
                  </span>

                  <div className="friends-person-copy">
                    <h3>{name}</h3>

                    {friend.username && (
                      <p>@{friend.username}</p>
                    )}
                  </div>

<button
  type="button"
  className="friends-write-button"
  disabled={openingFriendId !== null}
  onClick={() => void openChat(friend)}
>
  {openingFriendId === friend.friend_id
    ? 'Открываем…'
    : 'Написать'}
</button>

                </li>
              )
            })}
          </ul>
        )}
      </section>

      {isSearchOpen && (
        <UserSearchSheet onClose={() => setIsSearchOpen(false)} />
      )}
    </section>
  )
}