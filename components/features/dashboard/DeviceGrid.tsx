import { Skeleton } from '@/components/ui/skeleton'
import { DeviceCard } from './DeviceCard'
import type { Device } from '@/src/types'

interface Props {
  devices: Device[]
  isLoading: boolean
}

export function DeviceGrid({ devices, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    )
  }

  if (devices.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Không có thiết bị nào
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {devices.map(d => (
        <DeviceCard key={d.id} device={d} />
      ))}
    </div>
  )
}
