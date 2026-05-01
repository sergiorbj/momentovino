import { useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '../../lib/query-keys'

import { fetchEntitlement } from './api'

export function useEntitlement() {
  return useQuery({
    queryKey: queryKeys.entitlement,
    queryFn: fetchEntitlement,
    staleTime: 30_000,
  })
}

export function useInvalidateEntitlement() {
  const qc = useQueryClient()
  return () =>
    void qc.invalidateQueries({ queryKey: queryKeys.entitlement })
}
