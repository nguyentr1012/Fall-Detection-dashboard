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

// Bảng log alert lấy DUY NHẤT từ backend (nguồn sự thật). Trước đây hàm này còn
// merge alert live từ useAlertStore (MQTT) → cùng 1 cú ngã sinh 2 dòng vì id
// client (crypto.randomUUID) khác id server. useAlertStore giờ chỉ phục vụ UX
// real-time (FallDetectionOverlay + chuông), KHÔNG đẩy dòng vào bảng log nữa.
export const useCombinedAlerts = (limit = 20) => {
  const { data: apiAlerts = [], ...rest } = useAlerts(limit)

  const alerts = [...apiAlerts].sort(
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

export const useDeviceTimeline = (deviceId: string, limit = 20) =>
  useQuery({
    queryKey: ['timeline', deviceId, limit],
    queryFn: () => api.getTimeline(deviceId, limit),
    enabled: !!deviceId,
    refetchInterval: 30_000,
  })

export const useDeviceTelemetry = (deviceId: string, limit = 50) =>
  useQuery({
    queryKey: ['telemetry', deviceId, limit],
    queryFn: () => api.getTelemetryHistory(deviceId, limit),
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
    mutationFn: (payload: { full_name: string; height_cm: number; org_id?: string }) =>
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

export const useRegisterDevice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { device_id: string; firmware_version?: string; is_active: boolean; org_id?: string }) =>
      api.registerDevice(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  })
}

export const useUpdateDevice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { is_active?: boolean; firmware_version?: string; telemetry_interval?: number; fall_threshold?: number; fall_cooldown?: number } }) =>
      api.updateDevice(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      qc.invalidateQueries({ queryKey: ['device', id] })
      qc.invalidateQueries({ queryKey: ['config', id] })
    },
  })
}

// B5: gửi lệnh start/stop_stream qua backend (có isPending cho loading UX)
export const useSendDeviceCommand = () =>
  useMutation({
    mutationFn: ({ deviceId, action }: { deviceId: string; action: 'start_stream' | 'stop_stream' }) =>
      api.sendDeviceCommand(deviceId, action),
  })

export const useDeleteDevice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteDevice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  })
}

// Steps history for /alerts analytics
export const useStepsHistory = (days = 7, deviceId?: string) =>
  useQuery({
    queryKey: ['stepsHistory', days, deviceId],
    queryFn: () => api.getStepsHistory(days, deviceId),
    staleTime: 5 * 60_000,
  })
