import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { DeviceConfig, RecordingSession, Alert } from '@/src/types'
import { useAlertStore } from '@/store/useAlertStore'

// Devices – poll every 60 s to refresh battery & online status (per Master Spec)
export const useDevices = () =>
  useQuery({
    queryKey: ['devices'],
    queryFn: api.getDevices,
    refetchInterval: 60_000,
  })

export const useDevice = (id: string) =>
  useQuery({
    queryKey: ['device', id],
    queryFn: () => api.getDevice(id),
    enabled: !!id,
    refetchInterval: 60_000,
  })

// Alerts – poll every 30 s so fresh fall alerts appear quickly
export const useAlerts = (limit = 20) =>
  useQuery({
    queryKey: ['alerts', limit],
    queryFn: () => api.getAlerts(limit),
    refetchInterval: 30_000,
  })

export const useCombinedAlerts = (limit = 20) => {
  const { data: apiAlerts = [], ...rest } = useAlerts(limit)
  const realTimeAlerts = useAlertStore((s) => s.alerts)

  const combinedAlertsMap = new Map<string, Alert>()

  // 1. Add API-fetched alerts first
  apiAlerts.forEach((a) => combinedAlertsMap.set(a.id, a))

  // 2. Add/override with real-time alerts
  realTimeAlerts.forEach((a) => {
    const existing = combinedAlertsMap.get(a.id)
    if (!existing) {
      combinedAlertsMap.set(a.id, a)
    } else {
      // Prefer the acknowledged: true status from either source (synchronizing resolutions instantly)
      combinedAlertsMap.set(a.id, {
        ...existing,
        ...a,
        acknowledged: existing.acknowledged || a.acknowledged,
      })
    }
  })

  // Sort by timestamp descending (newest first)
  const alerts = Array.from(combinedAlertsMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return {
    ...rest,
    data: alerts.slice(0, limit),
  }
}


export const useDeviceAlerts = (deviceId: string, limit = 20) =>
  useQuery({
    queryKey: ['alerts', deviceId, limit],
    queryFn: () => api.getDeviceAlerts(deviceId, limit),
    enabled: !!deviceId,
    refetchInterval: 30_000,
  })

// Wearers
export const useWearers = () =>
  useQuery({ queryKey: ['wearers'], queryFn: api.getWearers })

export const useWearer = (id: string) =>
  useQuery({
    queryKey: ['wearer', id],
    queryFn: () => api.getWearer(id),
    enabled: !!id,
  })

// Device Config
export const useDeviceConfig = (deviceId: string) =>
  useQuery({
    queryKey: ['config', deviceId],
    queryFn: () => api.getDeviceConfig(deviceId),
    enabled: !!deviceId,
  })

export const useUpdateDeviceConfig = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deviceId, config }: { deviceId: string; config: Partial<DeviceConfig> }) =>
      api.updateDeviceConfig(deviceId, config),
    onSuccess: (_, { deviceId }) => qc.invalidateQueries({ queryKey: ['config', deviceId] }),
  })
}

// Recording session (Phase 1)
export const useSaveRecording = () =>
  useMutation({ mutationFn: (session: RecordingSession) => api.saveRecordingSession(session) })

// Wearer CRUD mutations
export const useCreateWearer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { full_name: string; height_cm: number; org_id: string }) =>
      api.createWearer(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wearers'] }),
  })
}

export const useUpdateWearer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { full_name?: string; height_cm?: number } }) =>
      api.updateWearer(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wearers'] }),
  })
}

export const useDeleteWearer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteWearer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wearers'] }),
  })
}

export const useAssignDevice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deviceId, wearerId }: { deviceId: string; wearerId: string }) =>
      api.assignDevice(deviceId, wearerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      qc.invalidateQueries({ queryKey: ['wearers'] })
    },
  })
}

export const useUnassignDevice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (deviceId: string) => api.unassignDevice(deviceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      qc.invalidateQueries({ queryKey: ['wearers'] })
    },
  })
}

// Steps history for /alerts analytics
export const useStepsHistory = (days = 7) =>
  useQuery({
    queryKey: ['stepsHistory', days],
    queryFn: () => api.getStepsHistory(days),
    staleTime: 5 * 60_000,
  })
