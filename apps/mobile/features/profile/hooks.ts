import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '../../lib/query-keys'
import {
  getProfile,
  setUsername,
  updateProfile,
  updateSettings,
  type ProfileDashboard,
  type UpdateProfileInput,
  type UpdateSettingsInput,
} from './api'

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: getProfile,
    staleTime: 60_000,
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateSettingsInput) => updateSettings(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.profile })
      const prev = qc.getQueryData<ProfileDashboard>(queryKeys.profile)
      if (prev) {
        qc.setQueryData<ProfileDashboard>(queryKeys.profile, {
          ...prev,
          profile: { ...prev.profile, ...input },
        })
      }
      return { prev }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.profile, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

export function useSetUsername() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (newUsername: string) => setUsername(newUsername),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}
