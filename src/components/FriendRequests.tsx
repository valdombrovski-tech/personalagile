import { useEffect, useState } from 'react'
import { Check, UserRoundPlus, X } from 'lucide-react'
import { supabase } from '../supabaseClient'

type FriendRequest = {
  friendship_id: string
  requester_id: string
  username: string
  display_name: string | null
  created_at: string
}

export function FriendRequests() {
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function loadRequests() {
    setIsLoading(true)
    setError('')

    const { data, error: loadError } = await supabase.rpc(
      'get_incoming_friend_requests'
    )

    setIsLoading(false)

    if (loadError) {
      console.error('Не удалось загрузить заявки в друзья:', loadError)
      setError('Не удалось загрузить заявки.')
      return
    }

    setRequests((data ?? []) as FriendRequest[])
  }

  useEffect(() => {
    void loadRequests()
  }, [])

  async function respondToRequest(
    friendshipId: string,
    action: 'accept' | 'decline'
  ) {
    setError('')
    setProcessingId(friendshipId)

    const functionName =
      action === 'accept'
        ? 'accept_friend_request'
        : 'decline_friend_request'

    const { error: respondError } = await supabase.rpc(functionName, {
      friendship_id: friendshipId,
    })

    setProcessingId(null)

    if (respondError) {
      console.error('Не удалось обработать заявку:', respondError)
      setError('Не удалось обработать заявку. Попробуйте ещё раз.')
      return
    }

    setRequests((currentRequests) =>
      currentRequests.filter((request) => request.friendship_id !== friendshipId)
    )
  }

  if (isLoading) {
    return null
  }

  if (error) {
    return (
      <section className="friend-requests friend-requests-error">
        <p>{error}</p>
        <button type="button" onClick={() => void loadRequests()}>
          Повторить
        </button>
      </section>
    )
  }

  if (!requests.length) {
    return null
  }

  return (
    <section
      className="friend-requests"
      aria-labelledby="friend-requests-title"
    >
      <div className="friend-requests-heading">
        <div>
          <span className="friend-requests-eyebrow">
            <UserRoundPlus size={15} aria-hidden="true" />
            Новое
          </span>
          <h2 id="friend-requests-title">Запросы в друзья</h2>
        </div>

        <span className="friend-requests-count">{requests.length}</span>
      </div>

      <div className="friend-requests-list">
        {requests.map((request) => {
          const isProcessing = processingId === request.friendship_id
          const avatarLetter = (
            request.display_name || request.username
          ).charAt(0).toUpperCase()

          return (
            <article className="friend-request" key={request.friendship_id}>
              <span className="friend-request-avatar" aria-hidden="true">
                {avatarLetter}
              </span>

              <div className="friend-request-copy">
                <strong>@{request.username}</strong>
                <p>
                  {request.display_name
                    ? `${request.display_name} хочет добавить вас в друзья`
                    : 'Хочет добавить вас в друзья'}
                </p>
              </div>

              <div className="friend-request-actions">
                <button
                  className="friend-request-decline"
                  type="button"
                  disabled={isProcessing}
                  aria-label={`Отклонить запрос от @${request.username}`}
                  title="Отклонить"
                  onClick={() =>
                    void respondToRequest(request.friendship_id, 'decline')
                  }
                >
                  <X size={17} />
                </button>

                <button
                  className="friend-request-accept"
                  type="button"
                  disabled={isProcessing}
                  aria-label={`Принять запрос от @${request.username}`}
                  title="Принять"
                  onClick={() =>
                    void respondToRequest(request.friendship_id, 'accept')
                  }
                >
                  <Check size={17} />
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}