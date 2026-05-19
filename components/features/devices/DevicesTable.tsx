'use client'

import { useState } from 'react'
import { Pencil, Trash2, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDeleteDevice, useAssignDevice, useUnassignDevice } from '@/hooks/useDeviceData'
import type { BackendWearer } from '@/services/api'
import type { Device } from '@/src/types'

interface Props {
  devices: Device[]
  wearers: BackendWearer[]
  isLoading: boolean
  onEdit: (device: Device) => void
}

export function DevicesTable({ devices, wearers, isLoading, onEdit }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const deleteDevice = useDeleteDevice()
  const assignDevice = useAssignDevice()
  const unassignDevice = useUnassignDevice()

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return }
    await deleteDevice.mutateAsync(id)
    setConfirmDelete(null)
  }

  const handleWearerChange = async (device: Device, value: string) => {
    if (value === 'none') {
      if (device.wearerId) await unassignDevice.mutateAsync(device.id)
    } else {
      await assignDevice.mutateAsync({ deviceId: device.id, wearerId: value })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (devices.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">Chưa có thiết bị nào</p>
        <p className="text-sm mt-1">Nhấn &quot;Thêm thiết bị&quot; để bắt đầu</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Device ID (MAC)</TableHead>
          <TableHead>Trạng thái / Fw</TableHead>
          <TableHead>Người đeo</TableHead>
          <TableHead className="text-right">Hành động</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {devices.map((device) => {
          return (
            <TableRow key={device.id}>
              <TableCell className="font-medium text-xs font-mono">{device.id}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 items-start">
                  <Badge variant={device.status === 'online' ? 'default' : 'secondary'} className={device.status === 'online' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                    {device.status === 'online' ? 'Đang hoạt động' : 'Tạm ngưng'}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">Fw: {device.firmwareVersion}</span>
                </div>
              </TableCell>
              <TableCell>
                <Select
                  value={device.wearerId ?? 'none'}
                  onValueChange={(v) => handleWearerChange(device, v)}
                >
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue placeholder="Chưa gán" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <UserX className="w-3 h-3" /> Không gán
                      </span>
                    </SelectItem>
                    {wearers.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-blue-500" />
                          {w.full_name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => onEdit(device)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-8 px-2 text-xs ${confirmDelete === device.id ? 'text-red-500 bg-red-50 dark:bg-red-950' : 'text-muted-foreground'}`}
                    onClick={() => handleDelete(device.id)}
                    disabled={deleteDevice.isPending}
                  >
                    {confirmDelete === device.id ? (
                      'Xác nhận xóa?'
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  {confirmDelete === device.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      onClick={() => setConfirmDelete(null)}
                    >
                      Hủy
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
