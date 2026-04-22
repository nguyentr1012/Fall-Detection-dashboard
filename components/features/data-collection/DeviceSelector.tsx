'use client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Device } from '@/src/types'

interface Props {
  devices: Device[]
  selectedId: string | null
  onSelect: (id: string) => void
  disabled?: boolean
}

export function DeviceSelector({ devices, selectedId, onSelect, disabled }: Props) {
  const online = devices.filter(d => d.status === 'online')

  return (
    <Select value={selectedId ?? ''} onValueChange={onSelect} disabled={disabled}>
      <SelectTrigger className="w-72">
        <SelectValue placeholder="Chọn thiết bị..." />
      </SelectTrigger>
      <SelectContent>
        {online.length === 0 ? (
          <SelectItem value="__none__" disabled>
            Không có thiết bị online
          </SelectItem>
        ) : (
          online.map(d => (
            <SelectItem key={d.id} value={d.id}>
              {d.name} — {d.location}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
