'use client'
import { useEffect, useRef, useState } from 'react'
import { getMqttClient } from '@/lib/mqtt-client'
import { useAlertStore } from '@/store/useAlertStore'
import type { IMUBatch } from '@/src/types'

export function useMqtt(deviceId: string | null) {
  const [isConnected, setIsConnected] = useState(false)
  const lastBatchRef = useRef<IMUBatch | null>(null)
  const [, forceUpdate] = useState(0)
  const addAlert = useAlertStore(s => s.addAlert)
  const setDeviceOnline = useAlertStore(s => s.setDeviceOnline)
  const setDeviceOffline = useAlertStore(s => s.setDeviceOffline)

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
      },
      (alert) => addAlert(alert)
    )

    return () => {
      client.unsubscribe(deviceId)
      client.disconnect()
      setIsConnected(false)
      setDeviceOffline(deviceId)
    }
  }, [deviceId])

  return { isConnected, lastBatch: lastBatchRef.current }
}
