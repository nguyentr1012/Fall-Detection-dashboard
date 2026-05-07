import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsStore {
  mqttBrokerUrl: string
  mqttUsername: string
  mqttPassword: string
  soundEnabled: boolean
  setMqttBrokerUrl: (url: string) => void
  setMqttUsername: (u: string) => void
  setMqttPassword: (p: string) => void
  setSoundEnabled: (v: boolean) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      mqttBrokerUrl: process.env.NEXT_PUBLIC_MQTT_BROKER_URL ?? '',
      mqttUsername: process.env.NEXT_PUBLIC_MQTT_USERNAME ?? '',
      mqttPassword: process.env.NEXT_PUBLIC_MQTT_PASSWORD ?? '',
      soundEnabled: true,
      setMqttBrokerUrl: (mqttBrokerUrl) => set({ mqttBrokerUrl }),
      setMqttUsername: (mqttUsername) => set({ mqttUsername }),
      setMqttPassword: (mqttPassword) => set({ mqttPassword }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
    }),
    { name: 'vitalsguard-settings' }
  )
)
