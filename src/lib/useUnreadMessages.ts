import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useUnreadMessages() {
  const [count, setCount] = useState(0)

  const loadCount = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_unread_message_count')

    if (error) {
      console.error('Не удалось получить число непрочитанных:', error)
      return
    }

    setCount(typeof data === 'number' ? data : 0)
  }, [])

  useEffect(() => {
    void loadCount()

    const channel = supabase
      .channel(`unread-messages-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        () => void loadCount()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'direct_messages' },
        () => void loadCount()
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadCount])

  return count
}