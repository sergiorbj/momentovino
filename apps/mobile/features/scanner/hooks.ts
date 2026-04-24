import { useMutation, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '../../lib/query-keys'
import { createWineViaApi } from './api'

export function useCreateWineViaApi() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createWineViaApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wines'] })
      qc.invalidateQueries({ queryKey: queryKeys.profile })
      qc.invalidateQueries({ queryKey: queryKeys.momentStats })
    },
  })
}
