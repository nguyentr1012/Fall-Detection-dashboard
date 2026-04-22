import { create } from 'zustand'
import type { Alert } from '@/src/types'

interface AlertStore {
  alerts: Alert[]
  onlineDevices: string[]
  addAlert: (alert: Alert) => void
  dismissAlert: (alertId: string) => void
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
        : [alert, ...s.alerts].slice(0, 50),
    })),
  dismissAlert: (alertId) =>
    set((s) => ({ alerts: s.alerts.filter((a) => a.id !== alertId) })),
  setDeviceOnline: (deviceId) =>
    set((s) => ({
      onlineDevices: s.onlineDevices.includes(deviceId)
        ? s.onlineDevices
        : [...s.onlineDevices, deviceId],
    })),
  setDeviceOffline: (deviceId) =>
    set((s) => ({ onlineDevices: s.onlineDevices.filter((id) => id !== deviceId) })),
}))
