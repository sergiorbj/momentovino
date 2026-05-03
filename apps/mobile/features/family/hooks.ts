import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '../../lib/query-keys'
import {
  acceptFamilyInvitation,
  createFamily,
  declineFamilyInvitation,
  getFamilyDashboard,
  inviteFamilyMemberByUsername,
  inviteMemberByEmail,
  listMyInvitations,
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

export function useMyInvitations() {
  return useQuery({
    queryKey: queryKeys.myInvitations,
    queryFn: listMyInvitations,
    staleTime: 30_000,
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

export function useInviteMemberByEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => inviteMemberByEmail(email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.family })
    },
  })
}

export function useInviteMemberByUsername() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => inviteFamilyMemberByUsername(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.family })
    },
  })
}

export function useAcceptInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => acceptFamilyInvitation(invitationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.family })
      qc.invalidateQueries({ queryKey: queryKeys.myInvitations })
      qc.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

export function useDeclineInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => declineFamilyInvitation(invitationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.myInvitations })
    },
  })
}
