import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { supabase } from '../supabaseClient'

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
  read_at: string | null
}

type DirectChatViewProps = {
  conversationId: string
  friendName: string
  onBack: () => void
  backLabel?: string
}

const MESSAGE_COLUMNS =
  'id, conversation_id, sender_id, body, created_at, read_at'

export function DirectChatView({
  conversationId,
  friendName,
  onBack,
  backLabel = '← К друзьям',
}: DirectChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [sendError, setSendError] = useState('')
  const historyRef = useRef<HTMLDivElement | null>(null)
  const currentUserIdRef = useRef('')

  const markRead = useCallback(async () => {
    if (document.visibilityState !== 'visible') return

    const { error } = await supabase.rpc('mark_conversation_read', {
      target_conversation_id: conversationId,
    })

    if (error) {
      console.error('Не удалось отметить сообщения прочитанными:', error)
    }
  }, [conversationId])

  const loadMessages = useCallback(
    async (silent = false) => {
      if (!silent) {
        setIsLoading(true)
      }

      setLoadError('')

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError
        if (!user) throw new Error('Необходимо войти в аккаунт.')

        currentUserIdRef.current = user.id
        setCurrentUserId(user.id)

        const { data, error } = await supabase
          .from('direct_messages')
          .select(MESSAGE_COLUMNS)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(100)

        if (error) throw error

        const loaded = ((data ?? []) as Message[]).reverse()

        if (!silent) {
          const firstUnread = loaded.find(
            (message) => message.sender_id !== user.id && !message.read_at
          )

          setFirstUnreadId(firstUnread?.id ?? null)
        }

        setMessages(loaded)
        void markRead()
      } catch (error) {
        console.error('Ошибка загрузки сообщений:', error)
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Не удалось загрузить сообщения.'
        )
      } finally {
        if (!silent) {
          setIsLoading(false)
        }
      }
    },
    [conversationId, markRead]
  )

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  useEffect(() => {
    const channel = supabase
      .channel(`direct-chat-${conversationId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as Message

          setMessages((current) =>
            current.some((item) => item.id === message.id)
              ? current
              : [...current, message]
          )

          if (message.sender_id !== currentUserIdRef.current) {
            void markRead()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message

          setMessages((current) =>
            current.map((item) =>
              item.id === updated.id
                ? { ...item, read_at: updated.read_at }
                : item
            )
          )
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void loadMessages(true)
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime недоступен:', status)
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId, loadMessages, markRead])

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void markRead()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      )
    }
  }, [markRead])

  useEffect(() => {
    const history = historyRef.current

    if (history) {
      history.scrollTop = history.scrollHeight
    }
  }, [messages])

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const text = body.trim()

    if (!text || isSending || !currentUserId) return

    setIsSending(true)
    setSendError('')

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          body: text,
        })
        .select(MESSAGE_COLUMNS)
        .single()

      if (error) {
        console.error('Ошибка отправки сообщения:', error)
        setSendError(error.message)
        return
      }

      const message = data as Message

      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, message]
      )

      setBody('')
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error)
      setSendError('Не удалось отправить сообщение. Попробуйте ещё раз.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="direct-chat">
      <div className="direct-chat-heading">
        <button
          type="button"
          className="friends-back-button"
          onClick={onBack}
        >
          {backLabel}
        </button>

        <h2>{friendName}</h2>

        <button
          type="button"
          className="friends-refresh-button"
          disabled={isLoading || isSending}
          onClick={() => void loadMessages()}
        >
          Обновить
        </button>
      </div>

      <p className="direct-chat-hint">
        Новые сообщения появляются автоматически. Показываем последние 100.
      </p>

      {loadError && (
        <p className="direct-chat-error" role="alert">
          {loadError}
        </p>
      )}

      <div className="direct-chat-history" ref={historyRef}>
        {isLoading ? (
          <p role="status">Загружаем сообщения…</p>
        ) : messages.length === 0 && !loadError ? (
          <p className="direct-chat-empty">
            Пока нет сообщений. Напишите первым.
          </p>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === currentUserId

            return (
              <Fragment key={message.id}>
                {message.id === firstUnreadId && (
                  <div className="direct-chat-divider">
                    Новые сообщения
                  </div>
                )}

                <article
                  className={
                    isOwn
                      ? 'direct-chat-message is-own'
                      : 'direct-chat-message'
                  }
                >
                  <p>{message.body}</p>

                  <div className="direct-chat-meta">
                    <time dateTime={message.created_at}>
                      {new Date(message.created_at).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>

                    {isOwn && (
                      <span
                        className={
                          message.read_at
                            ? 'direct-chat-status is-read'
                            : 'direct-chat-status'
                        }
                        title={
                          message.read_at ? 'Прочитано' : 'Отправлено'
                        }
                        aria-label={
                          message.read_at ? 'Прочитано' : 'Отправлено'
                        }
                      >
                        {message.read_at ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </article>
              </Fragment>
            )
          })
        )}
      </div>

      <form className="direct-chat-form" onSubmit={sendMessage}>
        <label htmlFor="direct-message-body">Сообщение</label>

        <textarea
          id="direct-message-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Напишите сообщение…"
          maxLength={4000}
          rows={3}
          disabled={isSending}
        />

        {sendError && (
          <p className="direct-chat-error" role="alert">
            {sendError}
          </p>
        )}

        <button
          type="submit"
          className="friends-search-button"
          disabled={
            isSending ||
            isLoading ||
            !currentUserId ||
            !body.trim()
          }
        >
          {isSending ? 'Отправляем…' : 'Отправить'}
        </button>
      </form>
    </section>
  )
}