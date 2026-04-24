import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '../../lib/query-keys'
import {
  createFamily,
  getFamilyDashboard,
  inviteMemberByEmail,
  updateFamily,
  type CreateFamilyInput,
  type UpdateFamilyInput,
} from './api'

export function useFamily() {
  return useQuery({
    queryKey: queryKeys.family,
    queryFn: getFamilyDashboard,
    staleTime: 60_000,
  })
}

export function useCreateFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateFamilyInput) => createFamily(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.family })
      qc.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

export function useUpdateFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateFamilyInput) => updateFamily(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.family })
    },
  })
}

export function useInviteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => inviteMemberByEmail(email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.family })
    },
  })
}
