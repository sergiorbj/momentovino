import { useMutation } from '@tanstack/react-query'

import { createWineViaApi } from './api'

/** Cache refresh runs in `scanner/result` after label upload so lists never refetch without `label_photo_url`. */
export function useCreateWineViaApi() {
  return useMutation({
    mutationFn: createWineViaApi,
  })
}
