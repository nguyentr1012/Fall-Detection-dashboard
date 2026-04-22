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
    if (latest && !seen.current.has(latest.id)) {
      seen.current.add(latest.id)
      toast.error('⚠️ Phát hiện té ngã!', {
        description: `${latest.deviceName}: ${latest.message}`,
        duration: 8000,
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
