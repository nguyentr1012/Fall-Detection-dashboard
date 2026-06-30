'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useUpdateDevice } from '@/hooks/useDeviceData'
import type { Device } from '@/src/types'

interface Props {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'   // giữ để tương thích; thiết bị nay tự auto-provision, dialog chỉ dùng để sửa
  device?: Device | null
}

export function DeviceFormDialog({ open, onClose, device }: Props) {
  const [isActive, setIsActive] = useState(true)
  const updateDevice = useUpdateDevice()
  const isPending = updateDevice.isPending

  useEffect(() => {
    if (open) setIsActive(device ? device.status === 'online' : true)
  }, [open, device])

  const handleSubmit = async () => {
    if (!device) return
    try {
      await updateDevice.mutateAsync({ id: device.id, payload: { is_active: isActive } })
      onClose()
    } catch {
      /* lỗi đã toast ở tầng api */
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa thiết bị</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Thông tin định danh — chỉ đọc (thiết bị tự sinh id từ MAC khi online) */}
          <div className="space-y-1">
            <Label>Device ID</Label>
            <p className="font-mono text-sm">{device?.id ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label>MAC (khóa MQTT)</Label>
            <p className="font-mono text-sm text-muted-foreground">{device?.mac ?? '— (chưa online)'}</p>
          </div>
          <div className="space-y-1">
            <Label>Phiên bản Firmware</Label>
            <p className="font-mono text-sm text-muted-foreground">{device?.firmwareVersion ?? '—'}</p>
          </div>

          <div className="flex items-center justify-between space-x-2 pt-2">
            <Label htmlFor="isActive" className="flex flex-col space-y-1">
              <span>Trạng thái hoạt động</span>
              <span className="font-normal text-xs text-muted-foreground">Bật để cho phép thiết bị gửi dữ liệu lên hệ thống</span>
            </Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Đang lưu...' : 'Cập nhật'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
