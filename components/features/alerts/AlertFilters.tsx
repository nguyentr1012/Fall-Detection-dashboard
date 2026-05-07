'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { Device } from '@/src/types'

interface Props {
  devices: Device[]
  deviceFilter: string
  typeFilter: string
  dateFilter: string
  onDeviceChange: (v: string) => void
  onTypeChange: (v: string) => void
  onDateChange: (v: string) => void
}

export function AlertFilters({
  devices,
  deviceFilter,
  typeFilter,
  dateFilter,
  onDeviceChange,
  onTypeChange,
  onDateChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select value={deviceFilter} onValueChange={onDeviceChange}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Tất cả thiết bị" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả thiết bị</SelectItem>
          {devices.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.id} {d.name !== 'Chưa gán' ? `(${d.name})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={typeFilter} onValueChange={onTypeChange}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Tất cả loại" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả loại</SelectItem>
          <SelectItem value="fall_detected">Té ngã</SelectItem>
          <SelectItem value="low_battery">Pin yếu</SelectItem>
          <SelectItem value="connection_lost">Mất kết nối</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="date"
        value={dateFilter}
        onChange={(e) => onDateChange(e.target.value)}
        className="w-40"
      />

      {(deviceFilter !== 'all' || typeFilter !== 'all' || dateFilter) && (
        <button
          onClick={() => { onDeviceChange('all'); onTypeChange('all'); onDateChange('') }}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Xóa bộ lọc
        </button>
      )}
    </div>
  )
}
