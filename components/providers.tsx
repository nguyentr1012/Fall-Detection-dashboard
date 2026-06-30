'use client'
import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { toast } from 'sonner'
import { queryClient } from '@/lib/query-client'
import { useAlertStore } from '@/store/useAlertStore'

import { useDevices } from '@/hooks/useDeviceData'

function RealtimeInit() {
  const { alerts } = useAlertStore()
  const { data: devices = [] } = useDevices()

  // Show toast for new critical alerts
  const latestAlert = alerts[0]
  useEffect(() => {
    if (!latestAlert || latestAlert.acknowledged) return
    
    if (latestAlert.severity === 'critical') {
      const device = devices.find(d => d.mac === latestAlert.deviceId || d.id === latestAlert.deviceId)
      const deviceIdToDisplay = device?.id || latestAlert.deviceId
      const displayName = device?.name && device.name !== 'Chưa gán' 
        ? `${deviceIdToDisplay} (${device.name})` 
        : deviceIdToDisplay

      toast.error(`Cảnh báo: ${latestAlert.message || 'Phát hiện té ngã'}`, {
        description: `Thiết bị ${displayName}`,
        duration: 8000,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestAlert?.id, devices])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <RealtimeInit />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
