import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'

import Dashboard from './Dashboard'
import { supabase } from './supabaseClient'

function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setMessage('')
    setErrorMessage('')

    if (!email.trim() || !password) {
      setErrorMessage('Введите e-mail и пароль.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Пароль должен содержать минимум 6 символов.')
      return
    }

    setIsSubmitting(true)

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      if (error) {
        setErrorMessage(error.message)
      } else if (data.session) {
        setMessage('Регистрация завершена. Вы вошли в приложение.')
      } else {
        setMessage(
          'Регистрация завершена. Проверьте e-mail и подтвердите адрес, затем войдите.'
        )
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setErrorMessage(error.message)
      }
    }

    setIsSubmitting(false)
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-eyebrow">PERSONAL AGILE</p>

        <h1>{mode === 'login' ? 'Войти' : 'Создать аккаунт'}</h1>

        <p className="auth-description">
          {mode === 'login'
            ? 'Войдите, чтобы работать со своими задачами.'
            : 'Зарегистрируйтесь, чтобы начать пользоваться приложением.'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            E-mail
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Пароль
            <input
              type="password"
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Минимум 6 символов"
              minLength={6}
              required
            />
          </label>

          {errorMessage && (
            <p className="auth-message auth-error">{errorMessage}</p>
          )}

          {message && (
            <p className="auth-message auth-success">{message}</p>
          )}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Подождите…'
              : mode === 'login'
                ? 'Войти'
                : 'Зарегистрироваться'}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode((currentMode) =>
              currentMode === 'login' ? 'signup' : 'login'
            )
            setMessage('')
            setErrorMessage('')
          }}
        >
          {mode === 'login'
            ? 'Нет аккаунта? Зарегистрироваться'
            : 'Уже есть аккаунт? Войти'}
        </button>
      </section>
    </main>
  )
}

function PendingApprovalScreen() {
  async function signOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Supabase error:', error)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-eyebrow">PERSONAL AGILE</p>

        <h1>Заявка ожидает одобрения</h1>

        <p className="auth-description">
          Аккаунт создан и e-mail подтверждён. Администратор должен
          подтвердить доступ к приложению.
        </p>

        <button onClick={signOut}>Выйти из аккаунта</button>
      </section>
    </main>
  )
}

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isApproved, setIsApproved] = useState(false)

  useEffect(() => {
    let isMounted = true
    let requestId = 0

    async function applySession(session: Session | null) {
      const currentRequestId = ++requestId

      if (!isMounted) {
        return
      }

      setIsLoading(true)

      if (!session) {
        setIsAuthenticated(false)
        setIsApproved(false)
        setIsLoading(false)
        return
      }

      setIsAuthenticated(true)
      setIsApproved(false)

console.log(
  'Checking approval for:',
  session.user.email,
  session.user.id
)

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('id', session.user.id)
        .single()

        console.log('Approval profile:', profile, error)

      if (!isMounted || currentRequestId !== requestId) {
        return
      }

      if (error) {
        console.error('Profile error:', error)
        setIsApproved(false)
      } else {
        setIsApproved(profile.is_approved === true)
      }

      setIsLoading(false)
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void applySession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        void applySession(session)
      }, 0)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (isLoading) {
    return <p>Загрузка...</p>
  }

  if (!isAuthenticated) {
    return <AuthScreen />
  }

  if (!isApproved) {
    return <PendingApprovalScreen />
  }

  return <Dashboard />
}
export default App