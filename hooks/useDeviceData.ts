import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { DeviceConfig, RecordingSession } from '@/src/types'

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
