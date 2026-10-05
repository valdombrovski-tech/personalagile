import { MessageCircle, Search, UserRoundPlus } from 'lucide-react'

type DirectPreviewProps = {
  onFindUser: () => void
}

export function DirectPreview({ onFindUser }: DirectPreviewProps) {
  return (
    <section className="direct-preview" aria-labelledby="direct-preview-title">
      <div className="direct-preview-header">
        <div className="direct-preview-title">
          <span className="direct-preview-icon" aria-hidden="true">
            <MessageCircle size={18} />
          </span>

          <div>
            <h2 id="direct-preview-title">Direct</h2>
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

      <div className="direct-empty-state">
        <span className="direct-empty-icon" aria-hidden="true">
          <UserRoundPlus size={24} />
        </span>

        <div>
          <h3>Пока нет диалогов</h3>
          <p>
            Найдите одобренного пользователя по никнейму, добавьте его в
            друзья — и здесь появятся сообщения.
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
    </section>
  )
}