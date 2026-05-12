import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '../../lib/query-keys'
import { countUserWines, deleteWinesByIds, searchWines } from '../moments/api'

export function useWinesSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.wines(query),
    queryFn: () => searchWines(query),
    staleTime: 30_000,
  })
}

export function useWinesCount() {
  return useQuery({
    queryKey: queryKeys.winesCount,
    queryFn: countUserWines,
    staleTime: 30_000,
  })
}

export function useDeleteWines() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => deleteWinesByIds(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wines'] })
      qc.invalidateQueries({ queryKey: ['moments'] })
      qc.invalidateQueries({ queryKey: queryKeys.profile })
      qc.invalidateQueries({ queryKey: queryKeys.family })
    },
  })
}
