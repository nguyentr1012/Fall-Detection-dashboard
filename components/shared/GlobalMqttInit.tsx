'use client'

import { useEffect, useRef } from 'react'
import { getMqttClient } from '@/lib/mqtt-client'
import { playAlarm } from '@/lib/alarm'
import { useAlertStore } from '@/store/useAlertStore'
import { useSettingsStore } from '@/store/useSettingsStore'

export function GlobalMqttInit() {
  const addAlert = useAlertStore((s) => s.addAlert)
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const soundEnabledRef = useRef(soundEnabled)
  soundEnabledRef.current = soundEnabled

  useEffect(() => {
    const client = getMqttClient()
    client.connect('global-monitor')
    client.subscribe(
      '*',
      () => {},
      (alert) => {
        addAlert(alert)
        if (soundEnabledRef.current && alert.type === 'fall_detected') {
          playAlarm()
        }
      }
    )
    return () => client.unsubscribe('*')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
