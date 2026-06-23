'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { BackendWearer } from '@/services/api'

interface Props {
  wearers: BackendWearer[]
  wearerFilter: string
  typeFilter: string
  dateFilter: string
  onWearerChange: (v: string) => void
  onTypeChange: (v: string) => void
  onDateChange: (v: string) => void
}

export function AlertFilters({
  wearers,
  wearerFilter,
  typeFilter,
  dateFilter,
  onWearerChange,
  onTypeChange,
  onDateChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select value={wearerFilter} onValueChange={onWearerChange}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Tất cả người đeo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả người đeo</SelectItem>
          {wearers.map((w) => (
            <SelectItem key={w.id} value={w.id}>
              {w.full_name}
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

      {(wearerFilter !== 'all' || typeFilter !== 'all' || dateFilter) && (
        <button
          onClick={() => { onWearerChange('all'); onTypeChange('all'); onDateChange('') }}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Xóa bộ lọc
        </button>
      )}
    </div>
  )
}
