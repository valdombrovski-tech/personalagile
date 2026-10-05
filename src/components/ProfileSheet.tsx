import { useState } from 'react'
import { supabase } from '../supabaseClient'

export type UserProfile = {
  id: string
  username: string | null
  display_name: string | null
}

type ProfileSheetProps = {
  profile: UserProfile
  required?: boolean
  onClose: () => void
  onSaved: (profile: UserProfile) => void
}

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/

export function ProfileSheet({
  profile,
  required = false,
  onClose,
  onSaved,
}: ProfileSheetProps) {
  const [username, setUsername] = useState(profile.username ?? '')
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function saveProfile() {
    const normalizedUsername = username.trim().toLowerCase()
    const normalizedDisplayName = displayName.trim()

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      setError(
        'Никнейм: 3–24 символа, только строчные латинские буквы, цифры и _.'
      )
      return
    }

    if (normalizedDisplayName.length > 60) {
      setError('Отображаемое имя должно быть не длиннее 60 символов.')
      return
    }

    setError('')
    setIsSaving(true)

    const { data, error: saveError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: profile.id,
          username: normalizedUsername,
          display_name: normalizedDisplayName || null,
        },
        { onConflict: 'id' }
      )
      .select('id, username, display_name')
      .single()

    setIsSaving(false)

    if (saveError) {
      if (saveError.code === '23505') {
        setError('Этот никнейм уже занят. Выберите другой.')
        return
      }

      console.error('Не удалось сохранить профиль:', saveError)
      setError('Не удалось сохранить профиль. Попробуйте ещё раз.')
      return
    }

    onSaved(data as UserProfile)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={required ? undefined : onClose}>
      <div
        className="sheet profile-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Профиль"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />

        <div className="sheet-header">
          <h2>{required ? 'Создайте профиль' : 'Мой профиль'}</h2>

          {!required && (
            <button
              className="icon-button"
              type="button"
              aria-label="Закрыть"
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>

        <div className="sheet-form">
          <p className="sheet-hint">
            Никнейм будет виден другим одобренным пользователям и понадобится
            для поиска в Direct.
          </p>

          <label className="field-label">
            Никнейм
            <div className="username-input-wrap">
              <span aria-hidden="true">@</span>
              <input
                type="text"
                value={username}
                placeholder="your_name"
                autoCapitalize="none"
                autoComplete="username"
                maxLength={24}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
          </label>

          <label className="field-label">
            Отображаемое имя
            <input
              type="text"
              value={displayName}
              placeholder="Как вас показывать в Direct"
              autoComplete="name"
              maxLength={60}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button
            className="primary-button"
            type="button"
            disabled={isSaving}
            onClick={() => void saveProfile()}
          >
            {isSaving ? 'Сохраняем…' : 'Сохранить профиль'}
          </button>
        </div>
      </div>
    </div>
  )
}