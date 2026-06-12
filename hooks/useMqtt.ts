'use client'
import { useEffect, useRef, useState } from 'react'
import { getMqttClient } from '@/lib/mqtt-client'
import { useAlertStore } from '@/store/useAlertStore'
import { useTelemetryStore } from '@/store/useTelemetryStore'
import type { IMUBatch } from '@/src/types'

export function useMqtt(deviceId: string | null) {
  const [isConnected, setIsConnected] = useState(false)
  const lastBatchRef = useRef<IMUBatch | null>(null)
  const [, forceUpdate] = useState(0)
  const addAlert = useAlertStore(s => s.addAlert)
  const setDeviceOnline = useAlertStore(s => s.setDeviceOnline)
  const setDeviceOffline = useAlertStore(s => s.setDeviceOffline)
  const updateTelemetry = useTelemetryStore(s => s.updateTelemetry)

  useEffect(() => {
    if (!deviceId) return

    const client = getMqttClient()
    client.connect(deviceId)
    setIsConnected(true)
    setDeviceOnline(deviceId)

    client.subscribe(
      deviceId,
      (batch) => {
        lastBatchRef.current = batch
        forceUpdate(n => n + 1)
        setDeviceOnline(deviceId)
      },
      (alert) => addAlert(alert),
      (id, data) => updateTelemetry(id, { ...data, last_seen: Date.now() })
    )

    return () => {
      client.unsubscribe(deviceId)
      client.disconnect()
      setIsConnected(false)
      setDeviceOffline(deviceId)
    }
  }, [deviceId])

  const sendCommand = (action: 'start_stream' | 'stop_stream' | 'ota_update') => {
    if (deviceId) {
      const client = getMqttClient()
      client.sendCommand(deviceId, action)
    }
  }

  return { isConnected, lastBatch: lastBatchRef.current, sendCommand }
}
