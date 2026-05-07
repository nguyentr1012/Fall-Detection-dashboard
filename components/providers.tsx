'use client'
import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { toast } from 'sonner'
import { queryClient } from '@/lib/query-client'
import { useAlertStore } from '@/store/useAlertStore'

function RealtimeInit() {
  const { alerts } = useAlertStore()

  // Show toast for new critical alerts
  const latestAlert = alerts[0]
  useEffect(() => {
    if (!latestAlert || latestAlert.acknowledged) return
    if (latestAlert.severity === 'critical') {
      toast.error(`Cảnh báo: ${latestAlert.message || 'Phát hiện té ngã'}`, {
        description: `Thiết bị ${latestAlert.deviceId}`,
        duration: 8000,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestAlert?.id])

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
