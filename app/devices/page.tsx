'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DevicesTable } from '@/components/features/devices/DevicesTable'
import { DeviceFormDialog } from '@/components/features/devices/DeviceFormDialog'
import { useDevices, useWearers } from '@/hooks/useDeviceData'
import type { Device } from '@/src/types'

export default function DevicesPage() {
  const { data: devices = [], isLoading: isDevicesLoading } = useDevices()
  const { data: wearers = [], isLoading: isWearersLoading } = useWearers()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDevice, setEditDevice] = useState<Device | null>(null)

  const handleEdit = (device: Device) => {
    setEditDevice(device)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditDevice(null)
    setDialogOpen(true)
  }

  const handleClose = () => {
    setDialogOpen(false)
    setEditDevice(null)
  }

  const isLoading = isDevicesLoading || isWearersLoading

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý thiết bị</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {devices.length} thiết bị đã đăng ký
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Đăng ký thiết bị
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Danh sách thiết bị phần cứng</CardTitle>
        </CardHeader>
        <CardContent>
          <DevicesTable
            devices={devices}
            wearers={wearers}
            isLoading={isLoading}
            onEdit={handleEdit}
          />
        </CardContent>
      </Card>

      <DeviceFormDialog
        open={dialogOpen}
        onClose={handleClose}
        mode={editDevice ? 'edit' : 'create'}
        device={editDevice}
      />
    </div>
  )
}
