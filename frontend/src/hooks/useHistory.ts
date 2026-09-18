import { useCallback, useEffect, useRef, useState } from 'react'
import { NetworkError, fetchHistory, type HistoryEntry } from '../api/client'

export interface HistoryState {
  entries: HistoryEntry[]
  /** True until the first load finishes, successfully or not. */
  loading: boolean
  error: string | null
  refresh: () => void
}

/** The server's recent calculations, loaded on mount and again on refresh(). */
export function useHistory(): HistoryState {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Only the latest request may update state; an older one answering late
  // would show a stale list.
  const inFlight = useRef<AbortController | null>(null)

  const refresh = useCallback(() => {
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller

    fetchHistory(controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) {
          setEntries(next)
          setError(null)
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof NetworkError ? reason.message : 'Could not load the history.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })
  }, [])

  useEffect(() => {
    refresh()
    return () => inFlight.current?.abort()
  }, [refresh])

  return { entries, loading, error, refresh }
}
