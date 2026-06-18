'use client'
import { Skeleton } from '@/components/ui/skeleton'
import { DeviceCard } from './DeviceCard'
import { useTelemetryStore } from '@/store/useTelemetryStore'
import type { Device, Alert } from '@/src/types'

interface Props {
  devices: Device[]
  alerts: Alert[]
  isLoading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
}

export function DeviceGrid({ devices, alerts, isLoading, selectedId, onSelect }: Props) {
  const getTelemetry = useTelemetryStore(s => s.getTelemetry)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-xl" />
        ))}
      </div>
    )
  }

  if (devices.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
        Không có thiết bị nào được kết nối
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {devices.map(d => {
        const rt = getTelemetry(d.id)
        const device = rt ? { ...d, batteryLevel: rt.battery_pct } : d
        return (
          <DeviceCard
            key={d.id}
            device={device}
            realtime={rt}
            criticalAlerts={alerts}
            isSelected={selectedId === d.id}
            onSelect={onSelect}
          />
        )
      })}
    </div>
  )
}
