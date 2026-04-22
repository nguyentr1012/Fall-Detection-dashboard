import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { DeviceConfig, RecordingSession } from '@/src/types'

export const useDevices = () =>
  useQuery({ queryKey: ['devices'], queryFn: api.getDevices })

export const useDevice = (id: string) =>
  useQuery({ queryKey: ['device', id], queryFn: () => api.getDevice(id), enabled: !!id })

export const useAlerts = (limit = 20) =>
  useQuery({ queryKey: ['alerts', limit], queryFn: () => api.getAlerts(limit) })

export const useDeviceAlerts = (deviceId: string, limit = 20) =>
  useQuery({
    queryKey: ['alerts', deviceId, limit],
    queryFn: () => api.getDeviceAlerts(deviceId, limit),
    enabled: !!deviceId,
  })

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

export const useSaveRecording = () =>
  useMutation({ mutationFn: (session: RecordingSession) => api.saveRecordingSession(session) })
