import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { DirectChatView } from './DirectChatView'

type Conversation = {
  conversation_id: string
  friend_id: string
  username: string | null
  display_name: string | null
  last_message: string | null
  last_message_at: string | null
  conversation_created_at: string
  unread_count: number
}

type MessagesViewProps = {
  onBack: () => void
  initialConversationId?: string | null
}

function getFriendName(conversation: Conversation) {
  return (
    conversation.display_name?.trim() ||
    (conversation.username
      ? `@${conversation.username}`
      : 'Пользователь')
  )
}

export function MessagesView({
  onBack,
  initialConversationId = null,
}: MessagesViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
    const [pendingConversationId, setPendingConversationId] = useState<
    string | null
  >(initialConversationId)

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true)
    }

    setErrorMessage('')

    try {
      const { data, error } = await supabase.rpc(
        'get_direct_conversations'
      )

      if (error) {
        console.error('Не удалось загрузить диалоги:', error)
        setErrorMessage(error.message)
        return
      }

      setConversations((data ?? []) as Conversation[])
    } catch (error) {
      console.error('Не удалось загрузить диалоги:', error)
      setErrorMessage('Не удалось загрузить диалоги. Попробуйте ещё раз.')
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

    useEffect(() => {
    if (!pendingConversationId) return

    const match = conversations.find(
      (conversation) =>
        conversation.conversation_id === pendingConversationId
    )

    if (match) {
      setActiveConversation(match)
      setPendingConversationId(null)
    }
  }, [conversations, pendingConversationId])

  useEffect(() => {
    const channel = supabase
      .channel(`direct-conversations-list-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        () => {
          void loadConversations(true)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
        },
        () => {
          void loadConversations(true)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void loadConversations(true)
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime недоступен:', status)
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadConversations])

  if (activeConversation) {
    return (
      <DirectChatView
        key={activeConversation.conversation_id}
        conversationId={activeConversation.conversation_id}
        friendName={getFriendName(activeConversation)}
        onBack={() => {
          setActiveConversation(null)
          void loadConversations(true)
        }}
        backLabel="← К сообщениям"
      />
    )
  }

  return (
    <section className="messages-page">
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
          className="friends-refresh-button"
          disabled={isLoading}
          onClick={() => void loadConversations()}
        >
          {isLoading ? 'Загрузка…' : 'Обновить'}
        </button>
      </div>

      {isLoading ? (
        <p role="status">Загружаем диалоги…</p>
      ) : errorMessage ? (
        <p className="friends-load-error" role="alert">
          {errorMessage}
        </p>
      ) : conversations.length === 0 ? (
        <div className="friends-list-section">
          <h2>Пока нет диалогов</h2>
          <p>
            Откройте «Друзья» через меню аккаунта и нажмите
            «Написать» у нужного человека.
          </p>
        </div>
      ) : (
        <ul className="messages-list">
          {conversations.map((conversation) => {
            const name = getFriendName(conversation)
            const date =
              conversation.last_message_at ||
              conversation.conversation_created_at

            const avatarLetter = (
              conversation.display_name?.trim() ||
              conversation.username ||
              '?'
            ).charAt(0).toUpperCase()

            return (
              <li key={conversation.conversation_id}>
                <button
                  className="messages-conversation"
                  type="button"
                  onClick={() => setActiveConversation(conversation)}
                >
                  <span className="friends-avatar" aria-hidden="true">
                    {avatarLetter}
                  </span>

                  <span className="messages-conversation-copy">
                    <span
                      className={
                        conversation.unread_count > 0
                          ? 'messages-conversation-name is-unread'
                          : 'messages-conversation-name'
                      }
                    >
                      {name}
                    </span>

                    <span className="messages-conversation-preview">
                      {conversation.last_message ?? 'Пока нет сообщений'}
                    </span>
                  </span>

                  <span className="messages-conversation-side">
                    <time dateTime={date}>
                      {new Date(date).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>

                    {conversation.unread_count > 0 && (
                      <span
                        className="unread-badge"
                        aria-label={`Непрочитанных: ${conversation.unread_count}`}
                      >
                        {conversation.unread_count > 99
                          ? '99+'
                          : conversation.unread_count}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}