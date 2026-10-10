import { useEffect, useRef, useState } from 'react'


type AccountMenuProps = {
  userEmail: string
  unreadMessages: number
  onOpenAccount: () => void
  onOpenFriends: () => void
  onOpenMessages: () => void
  onSignOut: () => void
}


export function AccountMenu({
  userEmail,
  unreadMessages,
  onOpenAccount,
  onOpenFriends,
  onOpenMessages,
  onSignOut,
}: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)


  useEffect(() => {
    if (!isOpen) return


    function handlePointerDown(event: PointerEvent) {
      const menu = menuRef.current


      if (menu && !menu.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }


    document.addEventListener('pointerdown', handlePointerDown)


    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isOpen])


  function handleAction(action: () => void) {
    setIsOpen(false)
    action()
  }


  const accountInitial = userEmail ? userEmail.charAt(0).toUpperCase() : '·'


  return (
    <div className="account-menu" ref={menuRef}>
      <button
        className="account-menu-trigger"
        type="button"
        aria-label={
          unreadMessages > 0
            ? `Открыть меню профиля, непрочитанных сообщений: ${unreadMessages}`
            : 'Открыть меню профиля'
        }
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        {accountInitial}
        {unreadMessages > 0 && (
          <span className="account-unread-dot" aria-hidden="true" />
        )}
      </button>


      {isOpen && (
        <div className="account-menu-panel">
          <p className="account-email">{userEmail || 'Загрузка профиля…'}</p>


          <button
            className="account-friends-button"
            type="button"
            onClick={() => handleAction(onOpenAccount)}
          >
            Мой аккаунт
          </button>


          <button
            className="account-friends-button"
            type="button"
            onClick={() => handleAction(onOpenFriends)}
          >
            Друзья
          </button>


          <button
            className="account-friends-button"
            type="button"
            onClick={() => handleAction(onOpenMessages)}
          >
            Сообщения
            {unreadMessages > 0 && (
              <span className="unread-badge">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </button>


          <button
            className="logout-button"
            type="button"
            onClick={() => handleAction(onSignOut)}
          >
            Выйти из аккаунта
          </button>
        </div>
      )}
    </div>
  )
}