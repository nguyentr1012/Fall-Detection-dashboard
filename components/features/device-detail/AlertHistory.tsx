'use client'
import { useDeviceAlerts } from '@/hooks/useDeviceData'
import { AlertTable } from '@/components/features/dashboard/AlertTable'

export function AlertHistory({ deviceId }: { deviceId: string }) {
  const { data: alerts = [], isLoading } = useDeviceAlerts(deviceId, 50)

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3">Lịch sử cảnh báo</h2>
      <AlertTable alerts={alerts} isLoading={isLoading} />
    </div>
  )
}
