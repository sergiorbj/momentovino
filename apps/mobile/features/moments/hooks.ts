import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Database } from '../../lib/database.types'
import { queryKeys } from '../../lib/query-keys'
import {
  createMoment,
  createWine,
  fetchMomentDetail,
  fetchMoments,
  fetchMomentStats,
  searchWines,
} from './api'
import type { MomentFormValues, WineInput } from './schema'

type WineRow = Database['public']['Tables']['wines']['Row']
type MomentRow = Database['public']['Tables']['moments']['Row']

function invalidateMomentSurfaces(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['moments'] })
  qc.invalidateQueries({ queryKey: ['wines'] })
  qc.invalidateQueries({ queryKey: queryKeys.profile })
}

/**
 * Handles the full moment creation flow: submit, loading state, error handling,
 * and navigation on success.
 */
export function useCreateMoment() {
  const qc = useQueryClient()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const submit = useCallback(
    async (values: MomentFormValues): Promise<MomentRow | null> => {
      try {
        setSubmitting(true)
        setError(null)
        const result = await createMoment(values)
        invalidateMomentSurfaces(qc)
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
    },
    [qc],
  )

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
 * Creates a new wine entry and navigates back to the new-moment form with
 * the wine params. Invalidates wine + profile-stats caches on success.
 */
export function useCreateWine() {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (input: WineInput) => createWine(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wines'] })
      qc.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })

  const submit = useCallback(
    async (input: WineInput): Promise<WineRow | null> => {
      try {
        const row = await mutation.mutateAsync(input)
        router.replace({
          pathname: '/moments/new',
          params: { wineId: row.id, wineName: row.name },
        })
        return row
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Unknown error')
        Alert.alert('Could not create wine', e.message)
        return null
      }
    },
    [mutation],
  )

  return { submit, creating: mutation.isPending } as const
}

/**
 * Fetches the current user's moments sorted by happened_at desc.
 */
export function useMoments() {
  const query = useQuery({
    queryKey: queryKeys.moments,
    queryFn: fetchMoments,
  })
  const qc = useQueryClient()
  return {
    moments: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refresh: () => qc.invalidateQueries({ queryKey: queryKeys.moments }),
  } as const
}

/**
 * Moments tab dashboard stats — pins for the globe + counters.
 */
export function useMomentStats() {
  const query = useQuery({
    queryKey: queryKeys.momentStats,
    queryFn: fetchMomentStats,
  })
  const qc = useQueryClient()
  return {
    stats: query.data ?? {
      momentsCount: 0,
      countriesCount: 0,
      winesCount: 0,
      pins: [],
    },
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refresh: () => qc.invalidateQueries({ queryKey: queryKeys.momentStats }),
  } as const
}

/**
 * Fetches a single moment with its wine and photos.
 */
export function useMomentDetail(id: string) {
  const query = useQuery({
    queryKey: queryKeys.momentDetail(id),
    queryFn: () => fetchMomentDetail(id),
    enabled: !!id,
  })
  return {
    moment: query.data?.moment ?? null,
    wine: query.data?.wine ?? null,
    photos: query.data?.photos ?? [],
    loading: query.isLoading,
  } as const
}
