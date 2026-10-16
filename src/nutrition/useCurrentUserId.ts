import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    void supabase.auth.getUser().then(({ data }) => {
      if (isActive) {
        setUserId(data.user?.id ?? null)
      }
    })

    return () => {
      isActive = false
    }
  }, [])

  return userId
}