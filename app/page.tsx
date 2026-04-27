'use client'
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useDevices, useAlerts } from '@/hooks/useDeviceData'
import { CriticalAlertBanner } from '@/components/features/dashboard/CriticalAlertBanner'
import { DeviceGrid } from '@/components/features/dashboard/DeviceGrid'
import { WeeklyActivityTrends } from '@/components/features/dashboard/WeeklyActivityTrends'
import { PatientProfile } from '@/components/features/dashboard/PatientProfile'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)

  const { data: devices = [], isLoading: devLoading } = useDevices()
  const { data: alerts = [], isLoading: alertLoading } = useAlerts(20)

  const criticalAlert = alerts.find(a => a.severity === 'critical' && !a.acknowledged) ?? null

  const onlineCount = devices.filter(d => d.status === 'online').length

  function handleDeviceSelect(id: string) {
    setSelectedDeviceId(prev => (prev === id ? null : id))
  }

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-auto p-6 space-y-6">
        {/* Critical Alert Banner */}
        {alertLoading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : criticalAlert ? (
          <CriticalAlertBanner alert={criticalAlert} />
        ) : null}

        {/* Connected Devices */}
        <section>
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Connected Devices</h2>
              <p className="text-xs text-gray-500">
                {onlineCount} device{onlineCount !== 1 ? 's' : ''} online across {new Set(devices.map(d => d.location)).size} monitoring zones
              </p>
            </div>
            <button className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
              Zone View <ChevronRight className="size-3.5" />
            </button>
          </div>

          <DeviceGrid
            devices={devices}
            alerts={alerts}
            isLoading={devLoading}
            selectedId={selectedDeviceId}
            onSelect={handleDeviceSelect}
          />
        </section>

        {/* Weekly Activity Trends */}
        <WeeklyActivityTrends />
      </div>

      {/* Right panel — Patient Profile */}
      {selectedDeviceId && (
        <div className="w-72 shrink-0 border-l border-gray-200 overflow-auto p-4 bg-gray-50">
          <PatientProfile deviceId={selectedDeviceId} />
        </div>
      )}
    </div>
  )
}
