'use client'
import { useDevices, useAlerts } from '@/hooks/useDeviceData'
import { DeviceGrid } from '@/components/features/dashboard/DeviceGrid'
import { AlertTable } from '@/components/features/dashboard/AlertTable'

export default function DashboardPage() {
  const { data: devices = [], isLoading: devLoading } = useDevices()
  const { data: alerts = [], isLoading: alertLoading } = useAlerts(10)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-4">Thiết bị</h1>
        <DeviceGrid devices={devices} isLoading={devLoading} />
      </div>
      <div>
        <h1 className="text-xl font-semibold mb-4">Cảnh báo gần đây</h1>
        <AlertTable alerts={alerts} isLoading={alertLoading} />
      </div>
    </div>
  )
}
