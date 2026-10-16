import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { PlanItem } from './types'

type AuthorRow = {
  user_id: string
  username: string | null
}

type AuthorState = {
  key: string
  names: Record<string, string>
}

export function usePlanAuthorNames(
  ownerId: string | null,
  viewerId: string | null,
  items: PlanItem[]
) {
  const authorIds = [...new Set(
    items
      .map((item) => item.updated_by)
      .filter((id): id is string => Boolean(id))
  )].sort()

  const requestKey = JSON.stringify([
    ownerId,
    viewerId,
    authorIds,
  ])

  const [state, setState] = useState<AuthorState>({
    key: '',
    names: {},
  })

  useEffect(() => {
    let active = true

    async function loadAuthors() {
      if (!ownerId || !viewerId || authorIds.length === 0) {
        if (active) {
          setState({ key: requestKey, names: {} })
        }

        return
      }

      const { data, error } = await supabase.rpc(
        'get_nutrition_plan_authors',
        { p_owner_id: ownerId }
      )

      if (!active) return

      if (error) {
        console.error(
          'Не удалось загрузить username авторов плана:',
          error
        )

        setState({ key: requestKey, names: {} })
        return
      }

      const names: Record<string, string> = {}

      for (const author of (data ?? []) as AuthorRow[]) {
        const username = author.username
          ?.trim()
          .replace(/^@+/, '')

        if (username) {
          names[author.user_id] = username
        }
      }

      setState({ key: requestKey, names })
    }

    void loadAuthors()

    return () => {
      active = false
    }
  }, [requestKey])

  return state.key === requestKey ? state.names : {}
}