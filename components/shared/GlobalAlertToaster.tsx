'use client'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useAlertStore } from '@/store/useAlertStore'
import { Toaster } from '@/components/ui/sonner'

function AlertWatcher() {
  const alerts = useAlertStore(s => s.alerts)
  const seen = useRef(new Set<string>())

  useEffect(() => {
    const latest = alerts[0]
    if (!latest || seen.current.has(latest.id)) return
    seen.current.add(latest.id)
    // fall_detected is handled by FallDetectionOverlay — only toast other types
    if (latest.type === 'fall_detected') return
    if (latest.type === 'low_battery') {
      toast.warning('🔋 Pin yếu', {
        description: `${latest.deviceName}: ${latest.message}`,
        duration: 6000,
      })
    } else {
      toast.error('📡 Mất kết nối', {
        description: `${latest.deviceName}: ${latest.message}`,
        duration: 6000,
      })
    }
  }, [alerts])

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
