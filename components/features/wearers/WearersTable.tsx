'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, UserCheck, UserX, Activity, LineChart, Settings } from 'lucide-react'
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
import { useDeleteWearer, useAssignDevice, useUnassignDevice } from '@/hooks/useDeviceData'
import type { BackendWearer } from '@/services/api'
import type { Device } from '@/src/types'

interface Props {
  wearers: BackendWearer[]
  devices: Device[]
  isLoading: boolean
  onEdit: (wearer: BackendWearer) => void
}

export function WearersTable({ wearers, devices, isLoading, onEdit }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const deleteWearer = useDeleteWearer()
  const assignDevice = useAssignDevice()
  const unassignDevice = useUnassignDevice()

  const getAssignedDevice = (wearerId: string) =>
    devices.find((d) => d.wearerId === wearerId) ?? null

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return }
    await deleteWearer.mutateAsync(id)
    setConfirmDelete(null)
  }

  const handleDeviceChange = async (wearer: BackendWearer, value: string) => {
    const current = getAssignedDevice(wearer.id)
    if (value === 'none') {
      if (current) await unassignDevice.mutateAsync(current.id)
    } else {
      await assignDevice.mutateAsync({ deviceId: value, wearerId: wearer.id })
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

  if (wearers.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">Chưa có bệnh nhân nào</p>
        <p className="text-sm mt-1">Nhấn &quot;Thêm bệnh nhân&quot; để bắt đầu</p>
      </div>
    )
  }

  const unassignedDevices = devices.filter((d) => !d.wearerId)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Họ và tên</TableHead>
          <TableHead>Chiều cao</TableHead>
          <TableHead>Thiết bị gán</TableHead>
          <TableHead className="text-right">Hành động</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {wearers.map((wearer) => {
          const assignedDevice = getAssignedDevice(wearer.id)
          const selectOptions = [
            ...(assignedDevice ? [assignedDevice] : []),
            ...unassignedDevices,
          ]

          return (
            <TableRow key={wearer.id}>
              <TableCell className="font-medium">{wearer.full_name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{wearer.height_cm} cm</Badge>
              </TableCell>
              <TableCell>
                <Select
                  value={assignedDevice?.id ?? 'none'}
                  onValueChange={(v) => handleDeviceChange(wearer, v)}
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
                    {selectOptions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-emerald-500" />
                          {d.id}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {assignedDevice && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-indigo-500 hover:text-indigo-600"
                        asChild
                        title="Lịch sử hoạt động"
                      >
                        <Link href={`/device/${assignedDevice.id}/history`}>
                          <Activity className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600"
                        asChild
                        title="Nhật ký Telemetry"
                      >
                        <Link href={`/device/${assignedDevice.id}/telemetry`}>
                          <LineChart className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-600"
                        asChild
                        title="Chi tiết & Cấu hình"
                      >
                        <Link href={`/device/${assignedDevice.id}`}>
                          <Settings className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                      <div className="w-px h-4 bg-gray-200 mx-1" />
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => onEdit(wearer)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-8 px-2 text-xs ${confirmDelete === wearer.id ? 'text-red-500 bg-red-50 dark:bg-red-950' : 'text-muted-foreground'}`}
                    onClick={() => handleDelete(wearer.id)}
                    disabled={deleteWearer.isPending}
                  >
                    {confirmDelete === wearer.id ? (
                      'Xác nhận xóa?'
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  {confirmDelete === wearer.id && (
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
