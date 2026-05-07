/**
 * useAlertStore.ts
 * Zustand store for managing real-time alerts.
 * Real-time alert delivery now comes exclusively from MQTT (via useMqtt hook).
 * The old Supabase Realtime subscription has been removed.
 */

import { create } from 'zustand'
import type { Alert } from '@/src/types'

interface AlertStore {
  alerts: Alert[]
  onlineDevices: string[]
  addAlert: (alert: Alert) => void
  dismissAlert: (alertId: string) => void
  acknowledgeAlert: (alertId: string) => void
  setDeviceOnline: (deviceId: string) => void
  setDeviceOffline: (deviceId: string) => void
}

export const useAlertStore = create<AlertStore>((set) => ({
  alerts: [],
  onlineDevices: [],

  addAlert: (alert) =>
    set((s) => ({
      alerts: s.alerts.find((a) => a.id === alert.id)
        ? s.alerts
        : [alert, ...s.alerts].slice(0, 50), // keep last 50 in memory
    })),

  dismissAlert: (alertId) =>
    set((s) => ({ alerts: s.alerts.filter((a) => a.id !== alertId) })),

  acknowledgeAlert: (alertId) =>
    set((s) => ({
      alerts: s.alerts.map((a) =>
        a.id === alertId ? { ...a, acknowledged: true } : a
      ),
    })),

  setDeviceOnline: (deviceId) =>
    set((s) => ({
      onlineDevices: s.onlineDevices.includes(deviceId)
        ? s.onlineDevices
        : [...s.onlineDevices, deviceId],
    })),

  setDeviceOffline: (deviceId) =>
    set((s) => ({ onlineDevices: s.onlineDevices.filter((id) => id !== deviceId) })),
}))
