import { create } from 'zustand'

export type DeviceTelemetry = {
  battery_pct: number
  walk_steps: number
  run_steps: number
  last_seen: number
}

type TelemetryStore = {
  telemetry: Record<string, DeviceTelemetry>
  mqttConnected: boolean
  updateTelemetry: (deviceId: string, data: Partial<DeviceTelemetry> & { last_seen?: number }) => void
  getTelemetry: (deviceId: string) => DeviceTelemetry | undefined
  setMqttConnected: (connected: boolean) => void
}

export const useTelemetryStore = create<TelemetryStore>((set, get) => ({
  telemetry: {},
  mqttConnected: false,

  updateTelemetry(deviceId, data) {
    set(state => ({
      telemetry: {
        ...state.telemetry,
        [deviceId]: {
          battery_pct: 0,
          walk_steps: 0,
          run_steps: 0,
          last_seen: Date.now(),
          ...state.telemetry[deviceId],
          ...data,
        },
      },
    }))
  },

  getTelemetry(deviceId) {
    return get().telemetry[deviceId]
  },

  setMqttConnected(connected) {
    set({ mqttConnected: connected })
  },
}))
