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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useRegisterDevice, useUpdateDevice } from '@/hooks/useDeviceData'
import type { Device } from '@/src/types'

interface Props {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  device?: Device | null
}

export function DeviceFormDialog({ open, onClose, mode, device }: Props) {
  const [deviceId, setDeviceId] = useState('')
  const [firmwareVersion, setFirmwareVersion] = useState('1.0.0')
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<{ deviceId?: string; firmwareVersion?: string }>({})

  const registerDevice = useRegisterDevice()
  const updateDevice = useUpdateDevice()
  const isPending = registerDevice.isPending || updateDevice.isPending

  useEffect(() => {
    if (open) {
      setDeviceId(device?.id ?? '')
      setFirmwareVersion(device?.firmwareVersion ?? '1.0.0')
      setIsActive(device ? device.status === 'online' : true)
      setErrors({})
    }
  }, [open, device])

  const validate = () => {
    const e: { deviceId?: string; firmwareVersion?: string } = {}
    if (!deviceId.trim()) e.deviceId = 'Device ID không được để trống'
    if (!firmwareVersion.trim()) e.firmwareVersion = 'Phiên bản Firmware không được để trống'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    try {
      if (mode === 'create') {
        await registerDevice.mutateAsync({
          device_id: deviceId.trim(),
          firmware_version: firmwareVersion.trim(),
          is_active: isActive,
          org_id: process.env.NEXT_PUBLIC_ORG_ID ?? '',
        })
      } else if (device) {
        await updateDevice.mutateAsync({
          id: device.id,
          payload: { 
            firmware_version: firmwareVersion.trim(),
            is_active: isActive 
          },
        })
      }
      onClose()
    } catch {
      setErrors({ deviceId: 'Lỗi khi lưu. Vui lòng thử lại.' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Đăng ký thiết bị mới' : 'Chỉnh sửa thiết bị'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="deviceId">Device ID (MAC Address) <span className="text-red-500">*</span></Label>
            <Input
              id="deviceId"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="VD: 1A:2B:3C:4D:5E:6F"
              disabled={mode === 'edit' || isPending}
            />
            {errors.deviceId && <p className="text-xs text-red-500">{errors.deviceId}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="firmwareVersion">Phiên bản Firmware <span className="text-red-500">*</span></Label>
            <Input
              id="firmwareVersion"
              value={firmwareVersion}
              onChange={(e) => setFirmwareVersion(e.target.value)}
              placeholder="1.0.0"
              disabled={isPending}
            />
            {errors.firmwareVersion && <p className="text-xs text-red-500">{errors.firmwareVersion}</p>}
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
            {isPending ? 'Đang lưu...' : mode === 'create' ? 'Đăng ký' : 'Cập nhật'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
