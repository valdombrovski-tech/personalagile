import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Lightbulb,
  ListChecks,
  MessageCircle,
} from 'lucide-react'
import type { View } from '../lib/types'


type BottomNavProps = {
  activeView: View | null
  unreadMessages: number
  onNavigate: (view: View) => void
  onOpenMessages: () => void
  onCreate: () => void
}


type OpenMenu = 'today' | 'inbox' | null


const INBOX_GROUP: View[] = ['inbox', 'ideas', 'in-progress', 'done']


export function BottomNav({
  activeView,
  unreadMessages,
  onNavigate,
  onOpenMessages,
  onCreate,
}: BottomNavProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
  const navRef = useRef<HTMLElement | null>(null)


  useEffect(() => {
    if (!openMenu) return


    function handlePointerDown(event: PointerEvent) {
      const nav = navRef.current


      if (nav && !nav.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }


    document.addEventListener('pointerdown', handlePointerDown)


    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [openMenu])


  function navigate(view: View) {
    setOpenMenu(null)
    onNavigate(view)
  }


  function handleSlotClick(menu: 'today' | 'inbox') {
    if (openMenu === menu) {
      navigate(menu)
      return
    }


    setOpenMenu(menu)
  }


  const isInboxGroupActive =
    activeView !== null && INBOX_GROUP.includes(activeView)


  return (
    <nav
      className="bottom-nav"
      aria-label="Разделы приложения"
      ref={navRef}
    >
      <div className="nav-slot">
        {openMenu === 'today' && (
          <div className="nav-popover" role="menu">
            <button
              className="nav-popover-item"
              type="button"
              role="menuitem"
            >
              <CalendarDays size={20} aria-hidden="true" />
              <span>Кнопка</span>
            </button>
          </div>
        )}


        <button
          className={activeView === 'today' ? 'is-active' : ''}
          type="button"
          onClick={() => handleSlotClick('today')}
        >
          <span className="nav-icon">◷</span>
          <span>Сегодня</span>
        </button>
      </div>


      <div className="nav-slot">
        {openMenu === 'inbox' && (
          <div className="nav-popover nav-popover-grid" role="menu">
            <button
              className="nav-popover-item"
              type="button"
              role="menuitem"
              onClick={() => navigate('ideas')}
            >
              <Lightbulb size={20} aria-hidden="true" />
              <span>Идеи</span>
            </button>


            <button
              className="nav-popover-item"
              type="button"
              role="menuitem"
              onClick={() => navigate('in-progress')}
            >
              <ListChecks size={20} aria-hidden="true" />
              <span>В работе</span>
            </button>


            <button
              className="nav-popover-item"
              type="button"
              role="menuitem"
              onClick={() => navigate('done')}
            >
              <CheckCircle2 size={20} aria-hidden="true" />
              <span>Готово</span>
            </button>


            <button
              className="nav-popover-item"
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenMenu(null)
                onOpenMessages()
              }}
            >
              <span className="nav-popover-icon">
                <MessageCircle size={20} aria-hidden="true" />
                {unreadMessages > 0 && (
                  <span className="nav-unread-dot" aria-hidden="true" />
                )}
              </span>
              <span>Direct</span>
            </button>
          </div>
        )}


        <button
          className={isInboxGroupActive ? 'is-active' : ''}
          type="button"
          aria-label={
            unreadMessages > 0
              ? 'Inbox, есть непрочитанные сообщения'
              : undefined
          }
          onClick={() => handleSlotClick('inbox')}
        >
          <span className="nav-icon">
            <span className="nav-icon-glyph">
              ↓
              {unreadMessages > 0 && (
                <span className="nav-unread-dot" aria-hidden="true" />
              )}
            </span>
          </span>
          <span>Inbox</span>
        </button>
      </div>


      <button
        className="nav-add-button"
        type="button"
        onClick={() => {
          setOpenMenu(null)
          onCreate()
        }}
        aria-label="Создать задачу"
      >
        +
      </button>
            <button
        className={activeView === 'biorhythms' ? 'is-active' : ''}
        type="button"
        aria-label="Мои биоритмы"
        onClick={() => navigate('biorhythms')}
      >
        <span className="nav-icon">
          <Activity size={20} aria-hidden="true" />
        </span>
        <span>Биоритмы</span>
      </button>
    </nav>
  )
}