import { create } from 'zustand'
import type { Alert } from '@/src/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface AlertStore {
  alerts: Alert[]
  onlineDevices: string[]
  realtimeChannel: RealtimeChannel | null
  addAlert: (alert: Alert) => void
  dismissAlert: (alertId: string) => void
  acknowledgeAlert: (alertId: string) => void
  setDeviceOnline: (deviceId: string) => void
  setDeviceOffline: (deviceId: string) => void
  subscribeToRealtime: () => () => void
  unsubscribeFromRealtime: () => void
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  alerts: [],
  onlineDevices: [],
  realtimeChannel: null,

  addAlert: (alert) =>
    set((s) => ({
      alerts: s.alerts.find((a) => a.id === alert.id)
        ? s.alerts
        : [alert, ...s.alerts].slice(0, 50),
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

  subscribeToRealtime: () => {
    const { createClient } = require('@/lib/supabase')
    const supabase = createClient()

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new
          const alert: Alert = {
            id: row.id as string,
            deviceId: row.device_id as string,
            deviceName: row.device_id as string,
            severity: row.severity as Alert['severity'],
            type: row.type as Alert['type'],
            message: (row.message as string | null) ?? '',
            timestamp: row.created_at as string,
            acknowledged: (row.acknowledged as boolean | null) ?? false,
          }
          get().addAlert(alert)
        }
      )
      .subscribe()

    set({ realtimeChannel: channel })

    return () => {
      supabase.removeChannel(channel)
      set({ realtimeChannel: null })
    }
  },

  unsubscribeFromRealtime: () => {
    const channel = get().realtimeChannel
    if (channel) {
      const { createClient } = require('@/lib/supabase')
      const supabase = createClient()
      supabase.removeChannel(channel)
      set({ realtimeChannel: null })
    }
  },
}))
