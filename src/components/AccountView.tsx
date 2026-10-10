import { useState } from 'react'
import { getTodayString } from '../lib/dates'


type AccountValues = {
  displayName: string
  birthDate: string
}


type AccountViewProps = {
  email: string
  username: string | null
  displayName: string | null
  birthDate: string
  onSave: (values: AccountValues) => Promise<boolean>
  onBack: () => void
}


export function AccountView({
  email,
  username,
  displayName,
  birthDate,
  onSave,
  onBack,
}: AccountViewProps) {
  const [nameDraft, setNameDraft] = useState(displayName ?? '')
  const [birthDraft, setBirthDraft] = useState(birthDate)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)


  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()


    if (birthDraft && birthDraft > getTodayString()) {
      setIsError(true)
      setMessage('Дата рождения не может быть в будущем')
      return
    }


    setIsSaving(true)
    setMessage('')


    const isSaved = await onSave({
      displayName: nameDraft,
      birthDate: birthDraft,
    })


    setIsSaving(false)
    setIsError(!isSaved)
    setMessage(isSaved ? 'Сохранено' : 'Не удалось сохранить. Попробуй ещё раз.')
  }


  return (
    <section className="account-page">
      <button className="account-back" type="button" onClick={onBack}>
        ← Назад
      </button>


      <form className="account-form" onSubmit={handleSubmit}>
        <label className="account-field">
          <span>Email</span>
          <input type="text" value={email} readOnly disabled />
        </label>


        <label className="account-field">
          <span>Никнейм</span>
          <input
            type="text"
            value={username ? `@${username}` : 'Не задан'}
            readOnly
            disabled
          />
        </label>


        <label className="account-field">
          <span>Имя</span>
          <input
            type="text"
            value={nameDraft}
            maxLength={60}
            placeholder="Как к тебе обращаться"
            onChange={(event) => setNameDraft(event.target.value)}
          />
        </label>


        <label className="account-field">
          <span>Дата рождения</span>
          <input
            type="date"
            min="1900-01-01"
            max={getTodayString()}
            value={birthDraft}
            onChange={(event) => setBirthDraft(event.target.value)}
          />
          
        </label>


        {message && (
          <p className={isError ? 'account-message is-error' : 'account-message'}>
            {message}
          </p>
        )}


        <button className="account-save" type="submit" disabled={isSaving}>
          {isSaving ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </form>
    </section>
  )
}