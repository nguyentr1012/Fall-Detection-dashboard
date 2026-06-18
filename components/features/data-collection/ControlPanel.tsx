'use client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatTime } from '@/lib/utils'
import type { ActivityLabel } from '@/src/types'

const LABELS: { value: ActivityLabel; label: string }[] = [
  { value: 'walk', label: 'Đi bộ' },
  { value: 'run', label: 'Chạy' },
  { value: 'transition_stand_sit', label: 'Chuyển trạng thái Đứng/Ngồi' },
  { value: 'transition_sit_lie', label: 'Chuyển trạng thái Ngồi/Nằm' },
  { value: 'fall', label: 'Té ngã' },
]

interface Props {
  isRecording: boolean
  sampleCount: number
  label: ActivityLabel
  onLabelChange: (l: ActivityLabel) => void
  onStart: () => void
  onStop: () => void
  disabled?: boolean
  pending?: boolean   // B5: đang chờ backend xác nhận lệnh start/stop
}

export function ControlPanel({
  isRecording, sampleCount, label, onLabelChange, onStart, onStop, disabled, pending,
}: Props) {
  const elapsed = sampleCount / 100

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 border rounded-xl bg-card">
      <Select
        value={label}
        onValueChange={v => onLabelChange(v as ActivityLabel)}
        disabled={isRecording || disabled}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LABELS.map(l => (
            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isRecording ? (
        <Button variant="destructive" onClick={onStop} disabled={pending}>
          {pending ? '⏳ Đang gửi lệnh…' : '⏹ Dừng & Lưu CSV'}
        </Button>
      ) : (
        <Button onClick={onStart} disabled={disabled || pending}>
          {pending ? '⏳ Đang gửi lệnh…' : '▶ Bắt đầu ghi'}
        </Button>
      )}

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>
          Số mẫu: <strong className="text-foreground">{sampleCount.toLocaleString()} samples</strong>
        </span>
        <span>
          Thời gian: <strong className="text-foreground">{formatTime(elapsed)}</strong>
        </span>
      </div>
    </div>
  )
}
