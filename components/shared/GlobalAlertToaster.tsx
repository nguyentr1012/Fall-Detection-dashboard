'use client'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useAlertStore } from '@/store/useAlertStore'
import { Toaster } from '@/components/ui/sonner'

import { useDevices } from '@/hooks/useDeviceData'

function AlertWatcher() {
  const alerts = useAlertStore(s => s.alerts)
  const { data: devices = [] } = useDevices()
  const seen = useRef(new Set<string>())

  useEffect(() => {
    const latest = alerts[0]
    if (!latest || seen.current.has(latest.id)) return
    seen.current.add(latest.id)
    // fall_detected is handled by FallDetectionOverlay — only toast other types
    if (latest.type === 'fall_detected') return
    
    const device = devices.find(d => d.mac === latest.deviceId || d.id === latest.deviceId)
    const deviceIdToDisplay = device?.id || latest.deviceId
    const displayName = device?.name && device.name !== 'Chưa gán' 
      ? `${deviceIdToDisplay} (${device.name})` 
      : deviceIdToDisplay

    if (latest.type === 'low_battery') {
      toast.warning('🔋 Pin yếu', {
        description: `${displayName}: ${latest.message}`,
        duration: 6000,
      })
    } else {
      toast.error('📡 Mất kết nối', {
        description: `${displayName}: ${latest.message}`,
        duration: 6000,
      })
    }
  }, [alerts, devices])

  return null
}

export function GlobalAlertToaster() {
  return (
    <>
      <AlertWatcher />
      <Toaster position="top-right" richColors />
    </>
  )
}
