import { useCallback, useEffect, useState } from 'react'
import { MessageCircle, Search, UserRoundPlus } from 'lucide-react'
import { supabase } from '../supabaseClient'

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

type DirectPreviewProps = {
  onFindUser: () => void
  onOpenMessages: (conversationId?: string) => void
}

const PREVIEW_LIMIT = 3

function getFriendName(conversation: Conversation) {
  return (
    conversation.display_name?.trim() ||
    (conversation.username
      ? `@${conversation.username}`
      : 'Пользователь')
  )
}

export function DirectPreview({
  onFindUser,
  onOpenMessages,
}: DirectPreviewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const loadConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc(
        'get_direct_conversations'
      )

      if (error) {
        console.error('Не удалось загрузить превью диалогов:', error)
        setErrorMessage('Не удалось загрузить диалоги.')
        return
      }

      setErrorMessage('')
      setConversations((data ?? []) as Conversation[])
    } catch (error) {
      console.error('Не удалось загрузить превью диалогов:', error)
      setErrorMessage('Не удалось загрузить диалоги.')
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  useEffect(() => {
    const channel = supabase
      .channel(`direct-preview-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        () => {
          void loadConversations()
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
          void loadConversations()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void loadConversations()
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime недоступен:', status)
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadConversations])

  const totalUnread = conversations.reduce(
    (sum, conversation) => sum + conversation.unread_count,
    0
  )

  const previewConversations = conversations.slice(0, PREVIEW_LIMIT)

  return (
    <section className="direct-preview" aria-labelledby="direct-preview-title">
      <div className="direct-preview-header">
        <div className="direct-preview-title">
          <span className="direct-preview-icon" aria-hidden="true">
            <MessageCircle size={18} />
          </span>

          <div>
            <h2 id="direct-preview-title">
              Direct
              {totalUnread > 0 && (
                <span
                  className="unread-badge"
                  aria-label={`Непрочитанных: ${totalUnread}`}
                >
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </h2>
            <p>Личные сообщения с друзьями</p>
          </div>
        </div>

        <button
          className="direct-search-button"
          type="button"
          aria-label="Найти пользователя"
          title="Найти пользователя"
          onClick={onFindUser}
        >
          <Search size={19} />
        </button>
      </div>

      {errorMessage && (
        <p className="friends-load-error" role="alert">
          {errorMessage}
        </p>
      )}

      {!isLoaded ? (
        <p className="direct-preview-loading" role="status">
          Загружаем диалоги…
        </p>
      ) : previewConversations.length > 0 ? (
        <>
          <ul className="messages-list direct-preview-list">
            {previewConversations.map((conversation) => {
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
                    onClick={() =>
                      onOpenMessages(conversation.conversation_id)
                    }
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
                        {getFriendName(conversation)}
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

          <div className="direct-preview-actions">
            <button
              className="direct-all-button"
              type="button"
              onClick={() => onOpenMessages()}
            >
              Все сообщения
            </button>

            <button
              className="direct-find-button"
              type="button"
              onClick={onFindUser}
            >
              <Search size={16} />
              Найти пользователя
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="direct-empty-state">
            <span className="direct-empty-icon" aria-hidden="true">
              <UserRoundPlus size={24} />
            </span>

            <div>
              <h3>Пока нет диалогов</h3>
              <p>
                Найдите одобренного пользователя по никнейму, добавьте его
                в друзья — и здесь появятся сообщения.
              </p>
            </div>
          </div>

          <button
            className="direct-find-button"
            type="button"
            onClick={onFindUser}
          >
            <Search size={16} />
            Найти пользователя
          </button>
        </>
      )}
    </section>
  )
}