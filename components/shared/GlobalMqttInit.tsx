'use client'

import { useEffect, useRef } from 'react'
import { getMqttClient } from '@/lib/mqtt-client'
import { playAlarm } from '@/lib/alarm'
import { useAlertStore } from '@/store/useAlertStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useTelemetryStore } from '@/store/useTelemetryStore'

export function GlobalMqttInit() {
  const addAlert = useAlertStore((s) => s.addAlert)
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const soundEnabledRef = useRef(soundEnabled)
  soundEnabledRef.current = soundEnabled
  const updateTelemetry = useTelemetryStore((s) => s.updateTelemetry)
  const setMqttConnected = useTelemetryStore((s) => s.setMqttConnected)

  useEffect(() => {
    const client = getMqttClient()
    client.connect('global-monitor')

    const offConnectionChange = client.onConnectionChange((connected) => setMqttConnected(connected))

    client.subscribe(
      '*',
      undefined, // KHÔNG đăng ký batch — global không cần luồng IMU 100Hz
      (alert) => {
        addAlert(alert)
        if (soundEnabledRef.current && alert.type === 'fall_detected') {
          playAlarm()
        }
      },
      (deviceId, data) => updateTelemetry(deviceId, { ...data, last_seen: Date.now() })
    )
    return () => {
      offConnectionChange()
      client.unsubscribe('*')
      client.disconnect() // đối xứng với connect() ở trên (ref-count)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
