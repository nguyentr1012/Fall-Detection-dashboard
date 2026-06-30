/**
 * services/api.ts
 * All data-fetching functions now go through the FastAPI backend
 * via apiClient (Bearer token from HTTP-only cookie).
 * Supabase has been fully removed.
 */

import { apiClient } from '@/lib/apiClient'
import type { Device, Alert, DeviceConfig } from '@/src/types'

export interface FirmwareVersion {
  version: string
  release_date: string
  changelog: string
  is_stable: boolean
  is_latest: boolean
  bin_size: number
  sha256: string
  download_url: string
}

export interface CurrentUser {
  id: string
  username: string
  role: 'ADMIN' | 'MANAGER'
}

// ---------------------------------------------------------------------------
// Shape of raw responses from FastAPI (matching backend Pydantic schemas)
// ---------------------------------------------------------------------------

export interface BackendWearer {
  id: string
  full_name: string
  height_cm: number
  org_id: string
  created_at: string
  updated_at: string
}

export interface BackendStepsDay {
  date: string         // "YYYY-MM-DD"
  steps: number
  walk_steps?: number
  run_steps?: number
  distance_km: number
}

export interface BackendTimelineEntry {
  id: string
  type: 'ALERT' | 'EVENT'
  title: string
  description: string | null
  created_at: string
}

interface BackendDevice {
  device_id: string
  mac?: string | null
  firmware_version: string | null
  is_active: boolean
  current_wearer_id: string | null
  wearer: BackendWearer | null
  created_at: string
  updated_at: string
  is_online?: boolean
  battery_pct?: number
  last_online?: string | null
  telemetry_interval?: number
  fall_threshold?: number
  fall_cooldown?: number
  fall_confirm_window?: number
  rssi_interval?: number
  last_rssi?: number
}

interface BackendAlert {
  id: string
  device_id: string
  wearer_id?: string | null
  alert_type: string
  confidence: number
  is_resolved: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function mapDevice(d: BackendDevice): Device {
  return {
    id: d.device_id,
    mac: d.mac ?? null,
    name: d.wearer?.full_name ?? 'Chưa gán',
    model: 'MPU-6050',
    status: d.is_online ? 'online' : 'offline',
    lastSeen: d.last_online ?? d.updated_at,
    lastAlert: null,
    firmwareVersion: d.firmware_version ?? '—',
    location: d.device_id,
    wearerId: d.current_wearer_id ?? null,
    batteryLevel: d.battery_pct,
    is_active: d.is_active,
    telemetry_interval: d.telemetry_interval,
    fall_threshold: d.fall_threshold,
    fall_cooldown: d.fall_cooldown,
    fall_confirm_window: d.fall_confirm_window,
    rssi_interval: d.rssi_interval,
    last_rssi: d.last_rssi,
  }
}

function mapAlert(a: BackendAlert): Alert {
  return {
    id: String(a.id),
    deviceId: a.device_id,
    wearerId: a.wearer_id ?? null,
    deviceName: a.device_id,
    severity: 'critical',
    type: 'fall_detected',
    message: `Phát hiện té ngã (confidence: ${(a.confidence * 100).toFixed(0)}%)`,
    timestamp: a.created_at,
    acknowledged: a.is_resolved,
  }
}

// ---------------------------------------------------------------------------
// API surface — mirrors the original shape so no consumer hooks change
// ---------------------------------------------------------------------------

export interface BackendVerificationSession {
  id: string
  device_id: string
  subject_code: string
  activity_code: string
  trial_no: string
  sample_count: number | null
  duration_s: number | null
  file_path: string | null
  created_at: string
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

function getAuthHeader(): Record<string, string> {
  if (typeof document === 'undefined') return {}
  const match = document.cookie.match(/(?:^|;\s*)auth_token=([^;]*)/)
  const token = match ? decodeURIComponent(match[1]) : undefined
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function downloadFile(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { headers: getAuthHeader() })
  if (!res.ok) throw new Error(`Download thất bại: ${res.status}`)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}

export const api = {
  // ── Devices ──────────────────────────────────────────────────────────────

  getDevices: async (): Promise<Device[]> => {
    const data = await apiClient.get<BackendDevice[]>('/api/v1/devices/')
    return data.map(mapDevice)
  },

  getDevice: async (id: string): Promise<Device> => {
    const data = await apiClient.get<BackendDevice>(`/api/v1/devices/${id}`)
    return mapDevice(data)
  },

  registerDevice: async (payload: { device_id: string; firmware_version?: string; is_active: boolean; org_id?: string }): Promise<Device> => {
    const data = await apiClient.post<BackendDevice>('/api/v1/devices/', payload)
    return mapDevice(data)
  },

  updateDevice: async (deviceId: string, payload: { is_active?: boolean; firmware_version?: string; telemetry_interval?: number; fall_threshold?: number; fall_cooldown?: number; fall_confirm_window?: number; stream_timeout?: number; rssi_interval?: number }): Promise<Device> => {
    const data = await apiClient.put<BackendDevice>(`/api/v1/devices/${deviceId}`, payload)
    return mapDevice(data)
  },

  // B5: gửi lệnh realtime QUA BACKEND (không publish MQTT thẳng từ client).
  sendDeviceCommand: async (deviceId: string, action: 'start_stream' | 'stop_stream'): Promise<void> => {
    await apiClient.post(`/api/v1/devices/${deviceId}/command`, { action })
  },

  deleteDevice: async (deviceId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/devices/${deviceId}`)
  },

  assignDevice: async (deviceId: string, wearerId: string): Promise<Device> => {
    const data = await apiClient.post<BackendDevice>(
      `/api/v1/devices/${deviceId}/assign`,
      { wearer_id: wearerId }
    )
    return mapDevice(data)
  },

  unassignDevice: async (deviceId: string): Promise<Device> => {
    const data = await apiClient.post<BackendDevice>(
      `/api/v1/devices/${deviceId}/unassign`
    )
    return mapDevice(data)
  },

  // ── Alerts / History ─────────────────────────────────────────────────────

  getAlerts: async (limit = 20): Promise<Alert[]> => {
    const data = await apiClient.get<BackendAlert[]>(
      `/api/v1/history/alerts?limit=${limit}`
    )
    return data.filter(a => !!a.wearer_id).map(mapAlert)
  },

  getWearerAlerts: async (wearerId: string, limit = 20): Promise<Alert[]> => {
    const data = await apiClient.get<BackendAlert[]>(
      `/api/v1/history/alerts?wearer_id=${wearerId}&limit=${limit}`
    )
    return data.map(mapAlert)
  },

  getTimeline: async (wearerId: string, limit = 20): Promise<BackendTimelineEntry[]> => {
    return apiClient.get<BackendTimelineEntry[]>(
      `/api/v1/history/${wearerId}/timeline?limit=${limit}`
    )
  },

  getTelemetryHistory: async (deviceId: string, limit = 50): Promise<any[]> => {
    // Expected to return telemetry points from InfluxDB
    return apiClient.get<any[]>(
      `/api/v1/history/${deviceId}/telemetry?limit=${limit}`
    )
  },

  acknowledgeAlert: async (alertId: string, deviceId?: string): Promise<void> => {
    // Backend uses is_resolved field — PATCH on the alert.
    // Truyền device_id để cơ chế Hybrid Alert Sync (protocol §4) scope fallback
    // đúng thiết bị khi alertId là UUID tạm do FE sinh (alert realtime từ MQTT).
    const qs = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : ''
    await apiClient.patch(`/api/v1/history/alerts/${alertId}/resolve${qs}`)
  },

  // ── Wearers ──────────────────────────────────────────────────────────────

  getWearers: async (): Promise<BackendWearer[]> => {
    return apiClient.get<BackendWearer[]>('/api/v1/wearers/')
  },

  getWearer: async (id: string): Promise<BackendWearer> => {
    return apiClient.get<BackendWearer>(`/api/v1/wearers/${id}`)
  },

  createWearer: async (payload: {
    full_name: string
    height_cm: number
    org_id?: string
  }): Promise<BackendWearer> => {
    return apiClient.post<BackendWearer>('/api/v1/wearers/', payload)
  },

  updateWearer: async (
    id: string,
    payload: { full_name?: string; height_cm?: number }
  ): Promise<BackendWearer> => {
    return apiClient.put<BackendWearer>(`/api/v1/wearers/${id}`, payload)
  },

  deleteWearer: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/wearers/${id}`)
  },

  // ── Device Config (kept for backward-compat — maps to wearer update) ──────

  getDeviceConfig: async (deviceId: string): Promise<DeviceConfig> => {
    const device = await apiClient.get<BackendDevice>(`/api/v1/devices/${deviceId}`)
    return {
      deviceId: device.device_id,
      name: device.wearer?.full_name ?? 'Chưa gán',
      samplingRate: 100,
      fallThreshold: device.fall_threshold ?? 0.25,
      transmitInterval: 500,
      alertEnabled: true,
      wearerName: device.wearer?.full_name,
      heightCm: device.wearer?.height_cm,
    }
  },

  updateDeviceConfig: async (
    deviceId: string,
    config: Partial<DeviceConfig>
  ): Promise<DeviceConfig> => {
    // If wearer fields changed, PATCH the wearer
    const device = await apiClient.get<BackendDevice>(`/api/v1/devices/${deviceId}`)
    if (device.wearer && (config.wearerName !== undefined || config.heightCm !== undefined)) {
      await apiClient.put(`/api/v1/wearers/${device.wearer.id}`, {
        ...(config.wearerName !== undefined && { full_name: config.wearerName }),
        ...(config.heightCm !== undefined && { height_cm: config.heightCm }),
      })
    }
    return api.getDeviceConfig(deviceId)
  },

  // ── Steps History ────────────────────────────────────────────────────────

  getStepsHistory: async (days = 7, deviceId?: string): Promise<BackendStepsDay[]> => {
    let url = `/api/v1/history/steps?days=${days}`
    if (deviceId) {
      url += `&device_id=${deviceId}`
    }
    return apiClient.get<BackendStepsDay[]>(url)
  },

  // ── Firmware OTA ─────────────────────────────────────────────────────────

  getFirmwareVersions: async (): Promise<FirmwareVersion[]> => {
    return apiClient.get<FirmwareVersion[]>('/api/v1/firmware/versions')
  },

  triggerFirmwareUpdate: async (deviceId: string, version: string, downloadUrl: string): Promise<void> => {
    await apiClient.post(`/api/v1/firmware/${deviceId}/update`, {
      version,
      download_url: downloadUrl,
    })
  },

  uploadFirmware: async (params: {
    file: File
    version: string
    release_date: string
    changelog: string
    is_stable: boolean
  }): Promise<FirmwareVersion> => {
    const fd = new FormData()
    fd.append('file', params.file)
    fd.append('version', params.version)
    fd.append('release_date', params.release_date)
    fd.append('changelog', params.changelog)
    fd.append('is_stable', String(params.is_stable))
    return apiClient.postFormData<FirmwareVersion>('/api/v1/firmware/upload', fd)
  },

  getCurrentUser: async (): Promise<CurrentUser> => {
    return apiClient.get<CurrentUser>('/api/v1/auth/me')
  },

  // ── Verification Sessions ─────────────────────────────────────────────────

  getVerificationSessions: async (filters?: { subject?: string; activity?: string }): Promise<BackendVerificationSession[]> => {
    const params = new URLSearchParams()
    if (filters?.subject) params.set('subject_code', filters.subject)
    if (filters?.activity) params.set('activity_code', filters.activity)
    const qs = params.toString()
    return apiClient.get<BackendVerificationSession[]>(
      qs ? `/api/v1/data-collection/sessions?${qs}` : '/api/v1/data-collection/sessions'
    )
  },

  createVerificationSession: async (body: {
    device_id: string
    subject_code: string
    activity_code: string
    trial_no: string
  }): Promise<BackendVerificationSession> => {
    return apiClient.post<BackendVerificationSession>('/api/v1/data-collection/sessions', body)
  },

  submitVerificationData: async (sessionId: string, samples: number[][]): Promise<BackendVerificationSession> => {
    return apiClient.post<BackendVerificationSession>(
      `/api/v1/data-collection/sessions/${sessionId}/data`,
      { session_id: sessionId, samples }
    )
  },

  updateVerificationTrial: async (sessionId: string, trialNo: string): Promise<BackendVerificationSession> => {
    return apiClient.patch<BackendVerificationSession>(
      `/api/v1/data-collection/sessions/${sessionId}`,
      { trial_no: trialNo }
    )
  },

  deleteVerificationSession: async (sessionId: string): Promise<void> => {
    await apiClient.delete<void>(`/api/v1/data-collection/sessions/${sessionId}`)
  },

  downloadVerificationFile: async (sessionId: string, filename?: string): Promise<void> => {
    await downloadFile(
      `${BACKEND_URL}/api/v1/data-collection/sessions/${sessionId}/download`,
      filename ?? `${sessionId}.txt`
    )
  },

  exportAllVerification: async (): Promise<void> => {
    await downloadFile(
      `${BACKEND_URL}/api/v1/data-collection/export`,
      'verification_dataset.zip'
    )
  },
}
