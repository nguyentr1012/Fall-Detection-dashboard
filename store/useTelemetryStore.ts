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
    set(state => {
      const prev = state.telemetry[deviceId]
      return {
        telemetry: {
          ...state.telemetry,
          // Default 0 CHỈ khi chưa có giá trị cũ — partial update (vd chỉ battery)
          // phải GIỮ NGUYÊN walk_steps/run_steps đã có, không ép về 0.
          [deviceId]: {
            battery_pct: prev?.battery_pct ?? 0,
            walk_steps: prev?.walk_steps ?? 0,
            run_steps: prev?.run_steps ?? 0,
            ...data,
            last_seen: data.last_seen ?? Date.now(),
          },
        },
      }
    })
  },

  getTelemetry(deviceId) {
    return get().telemetry[deviceId]
  },

  setMqttConnected(connected) {
    set({ mqttConnected: connected })
  },
}))
