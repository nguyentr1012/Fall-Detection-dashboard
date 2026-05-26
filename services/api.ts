/**
 * services/api.ts
 * All data-fetching functions now go through the FastAPI backend
 * via apiClient (Bearer token from HTTP-only cookie).
 * Supabase has been fully removed.
 */

import { apiClient } from '@/lib/apiClient'
import type { Device, Alert, DeviceConfig, RecordingSession } from '@/src/types'

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
  walk_steps: number
  run_steps: number
  distance_km: number
}

interface BackendDevice {
  device_id: string
  firmware_version: string | null
  is_active: boolean
  current_wearer_id: string | null
  wearer: BackendWearer | null
  created_at: string
  updated_at: string
  is_online?: boolean
  battery_pct?: number
  last_online?: string | null
}

interface BackendAlert {
  id: string
  device_id: string
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
    name: d.wearer?.full_name ?? 'Chưa gán',
    model: 'MPU-6050',
    status: d.is_online ? 'online' : 'offline',
    lastSeen: d.last_online ?? d.updated_at,
    lastAlert: null,
    firmwareVersion: d.firmware_version ?? '1.0.0',
    location: d.device_id,
    wearerId: d.current_wearer_id ?? null,
    batteryLevel: d.battery_pct,
  }
}

function mapAlert(a: BackendAlert): Alert {
  return {
    id: String(a.id),
    deviceId: a.device_id,
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

  registerDevice: async (deviceId: string): Promise<Device> => {
    const data = await apiClient.post<BackendDevice>('/api/v1/devices/', {
      device_id: deviceId,
      is_active: true,
    })
    return mapDevice(data)
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
    return data.map(mapAlert)
  },

  getDeviceAlerts: async (deviceId: string, limit = 20): Promise<Alert[]> => {
    const data = await apiClient.get<BackendAlert[]>(
      `/api/v1/history/alerts?device_id=${deviceId}&limit=${limit}`
    )
    return data.map(mapAlert)
  },

  acknowledgeAlert: async (alertId: string, deviceId?: string): Promise<void> => {
    // Backend uses is_resolved field — PATCH on the alert, with optional device_id fallback
    const url = deviceId
      ? `/api/v1/history/alerts/${alertId}/resolve?device_id=${deviceId}`
      : `/api/v1/history/alerts/${alertId}/resolve`
    await apiClient.patch(url)
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
    org_id: string
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
      fallThreshold: 2.5,
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

  getStepsHistory: async (days = 7): Promise<BackendStepsDay[]> => {
    return apiClient.get<BackendStepsDay[]>(`/api/v1/history/steps?days=${days}`)
  },

  // ── Recording Session (Phase 1 — data collection) ────────────────────────

  saveRecordingSession: async (session: RecordingSession): Promise<{ id: string }> => {
    // Encode samples as JSON payload to backend (custom endpoint expected)
    const data = await apiClient.post<{ id: string }>(
      '/api/v1/data-collection/sessions',
      {
        device_id: session.deviceId,
        label: session.label,
        start_timestamp: session.startTimestamp,
        end_timestamp: session.endTimestamp,
        sample_count: session.sampleCount,
        samples: session.samples,
      }
    )
    return data
  },
}
