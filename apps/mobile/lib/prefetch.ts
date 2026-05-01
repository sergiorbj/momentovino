import type { QueryClient } from '@tanstack/react-query'

import { fetchEntitlement } from '../features/entitlement/api'
import { getFamilyDashboard } from '../features/family/api'
import {
  countUserWines,
  fetchMomentStats,
  fetchMoments,
  searchWines,
} from '../features/moments/api'
import { getProfile } from '../features/profile/api'
import { queryKeys } from './query-keys'

/**
 * Warm the React Query cache for the top-level tabs right after the session is
 * established so that navigating into a tab doesn't trigger a visible load.
 * Runs in parallel; failures are swallowed so a bad endpoint never blocks the app.
 */
export function prefetchCoreData(queryClient: QueryClient): void {
  const tasks: Array<Promise<unknown>> = [
    queryClient.prefetchQuery({
      queryKey: queryKeys.entitlement,
      queryFn: fetchEntitlement,
    }),
    queryClient.prefetchQuery({ queryKey: queryKeys.profile, queryFn: getProfile }),
    queryClient.prefetchQuery({ queryKey: queryKeys.momentStats, queryFn: fetchMomentStats }),
    queryClient.prefetchQuery({ queryKey: queryKeys.moments, queryFn: fetchMoments }),
    queryClient.prefetchQuery({ queryKey: queryKeys.wines(''), queryFn: () => searchWines('') }),
    queryClient.prefetchQuery({ queryKey: queryKeys.winesCount, queryFn: countUserWines }),
    queryClient.prefetchQuery({ queryKey: queryKeys.family, queryFn: getFamilyDashboard }),
  ]

  void Promise.allSettled(tasks)
}
