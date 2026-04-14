import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'
import { router } from 'expo-router'

import type { Database } from '../../lib/database.types'
import {
  createMoment,
  createWine,
  fetchMomentDetail,
  fetchMoments,
  searchWines,
  type MomentDetail,
  type MomentWithWine,
} from './api'
import type { MomentFormValues, WineInput } from './schema'

type WineRow = Database['public']['Tables']['wines']['Row']
type MomentRow = Database['public']['Tables']['moments']['Row']

/**
 * Handles the full moment creation flow: submit, loading state, error handling,
 * and navigation on success.
 */
export function useCreateMoment() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const submit = useCallback(async (values: MomentFormValues): Promise<MomentRow | null> => {
    try {
      setSubmitting(true)
      setError(null)
      const result = await createMoment(values)
      router.back()
      return result
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Unknown error')
      setError(e)
      Alert.alert('Could not save moment', e.message)
      return null
    } finally {
      setSubmitting(false)
    }
  }, [])

  return { submit, submitting, error } as const
}

/**
 * Debounced wine search with loading state.
 * Results update automatically when `query` changes.
 */
export function useWineSearch(debounceMs = 220) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WineRow[]>([])
  const [loading, setLoading] = useState(false)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    setLoading(true)

    const handle = setTimeout(async () => {
      try {
        const rows = await searchWines(query)
        if (!cancelledRef.current) setResults(rows)
      } catch (err) {
        console.error('Wine search failed', err)
      } finally {
        if (!cancelledRef.current) setLoading(false)
      }
    }, debounceMs)

    return () => {
      cancelledRef.current = true
      clearTimeout(handle)
    }
  }, [query, debounceMs])

  return { query, setQuery, results, loading } as const
}

/**
 * Handles creating a new wine entry and selecting it by navigating back
 * to the new-moment form with the wine params.
 */
export function useCreateWine() {
  const [creating, setCreating] = useState(false)

  const submit = useCallback(async (input: WineInput): Promise<WineRow | null> => {
    try {
      setCreating(true)
      const row = await createWine(input)
      router.replace({
        pathname: '/moments/new',
        params: { wineId: row.id, wineName: row.name },
      })
      return row
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Unknown error')
      Alert.alert('Could not create wine', e.message)
      return null
    } finally {
      setCreating(false)
    }
  }, [])

  return { submit, creating } as const
}

/**
 * Fetches the current user's moments sorted by happened_at desc.
 * Provides `refresh()` for pull-to-refresh.
 */
export function useMoments() {
  const [moments, setMoments] = useState<MomentWithWine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchMoments()
      setMoments(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load moments'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { moments, loading, error, refresh: load } as const
}

/**
 * Fetches a single moment with its wine and photos.
 */
export function useMomentDetail(id: string) {
  const [data, setData] = useState<MomentDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchMomentDetail(id)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => console.error('Failed to load moment detail', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  return {
    moment: data?.moment ?? null,
    wine: data?.wine ?? null,
    photos: data?.photos ?? [],
    loading,
  } as const
}
