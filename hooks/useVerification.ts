import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { BackendVerificationSession } from '@/services/api'

export function useVerificationSessions(filters?: { subject?: string; activity?: string }) {
  return useQuery({
    queryKey: ['verification-sessions', filters],
    queryFn: () => api.getVerificationSessions(filters),
    staleTime: 10_000,
  })
}

export function useCreateVerificationSession() {
  return useMutation({
    mutationFn: (body: {
      device_id: string
      subject_code: string
      activity_code: string
      trial_no: string
    }) => api.createVerificationSession(body),
  })
}

export function useSubmitVerificationData() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, samples }: { sessionId: string; samples: number[][] }) =>
      api.submitVerificationData(sessionId, samples),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verification-sessions'] }),
  })
}

export function useUpdateVerificationTrial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, trialNo }: { sessionId: string; trialNo: string }) =>
      api.updateVerificationTrial(sessionId, trialNo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verification-sessions'] }),
  })
}

export function useDeleteVerificationSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => api.deleteVerificationSession(sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verification-sessions'] }),
  })
}

export type { BackendVerificationSession }
