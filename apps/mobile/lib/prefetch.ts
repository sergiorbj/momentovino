import type { QueryClient } from '@tanstack/react-query'

import { fetchEntitlement } from '../features/entitlement/api'
import { getFamilyDashboard, listMyInvitations } from '../features/family/api'
import {
  countUserWines,
  fetchMomentStats,
  fetchMoments,
  searchWines,
} from '../features/moments/api'
import { getProfile } from '../features/profile/api'
import { queryKeys } from './query-keys'

function corePrefetchTasks(queryClient: QueryClient): Array<Promise<unknown>> {
  return [
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
    queryClient.prefetchQuery({ queryKey: queryKeys.myInvitations, queryFn: listMyInvitations }),
  ]
}

/**
 * Warm the React Query cache for the top-level tabs right after the session is
 * established so that navigating into a tab doesn't trigger a visible load.
 * Runs in parallel; failures are swallowed so a bad endpoint never blocks the app.
 */
export function prefetchCoreData(queryClient: QueryClient): void {
  void Promise.allSettled(corePrefetchTasks(queryClient))
}

/**
 * Same as {@link prefetchCoreData} but waits for prefetch work to finish. Use
 * after session changes (new account, returning login) before routing to tabs.
 */
export async function prefetchCoreDataAsync(queryClient: QueryClient): Promise<void> {
  await Promise.allSettled(corePrefetchTasks(queryClient))
}

/**
 * Invalidate every query scope bound to the current Supabase user, then warm
 * tab caches. Clears anonymous (or prior user) data after login.
 */
export async function invalidateTabCachesAndPrefetch(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.entitlement }),
    queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
    queryClient.invalidateQueries({ queryKey: ['moments'] }),
    queryClient.invalidateQueries({ queryKey: ['wines'] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.family }),
    queryClient.invalidateQueries({ queryKey: queryKeys.myInvitations }),
  ])
  await prefetchCoreDataAsync(queryClient)
}
