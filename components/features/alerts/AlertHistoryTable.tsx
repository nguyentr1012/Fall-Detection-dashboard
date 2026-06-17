'use client'

import { useState } from 'react'
import { CheckCheck, AlertTriangle, Wifi, Battery } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useAlertStore } from '@/store/useAlertStore'
import type { Alert } from '@/src/types'

const TYPE_LABEL: Record<string, { label: string; icon: React.ReactNode }> = {
  fall_detected: { label: 'Té ngã', icon: <AlertTriangle className="w-3 h-3" /> },
  low_battery: { label: 'Pin yếu', icon: <Battery className="w-3 h-3" /> },
  connection_lost: { label: 'Mất kết nối', icon: <Wifi className="w-3 h-3" /> },
}

interface Props {
  alerts: Alert[]
  isLoading: boolean
}

export function AlertHistoryTable({ alerts, isLoading }: Props) {
  const [ackingIds, setAckingIds] = useState<Set<string>>(new Set())
  const acknowledgeAlert = useAlertStore((s) => s.acknowledgeAlert)
  const qc = useQueryClient()

  const handleAck = async (alertId: string, deviceId?: string) => {
    setAckingIds((s) => new Set(s).add(alertId))
    try {
      await api.acknowledgeAlert(alertId, deviceId)
      acknowledgeAlert(alertId)
      qc.invalidateQueries({ queryKey: ['alerts'] })
    } finally {
      setAckingIds((s) => { const n = new Set(s); n.delete(alertId); return n })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Không có cảnh báo nào phù hợp</p>
      </div>
    )
  }

  return (
    <div className="overflow-auto max-h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thời gian</TableHead>
            <TableHead>Thiết bị</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Thông tin</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => {
            const typeInfo = TYPE_LABEL[alert.type] ?? { label: alert.type, icon: null }
            return (
              <TableRow key={alert.id}>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {new Date(alert.timestamp).toLocaleString('vi-VN')}
                </TableCell>
                <TableCell className="font-mono text-xs">{alert.deviceId}</TableCell>
                <TableCell>
                  <Badge
                    variant={alert.type === 'fall_detected' ? 'destructive' : 'secondary'}
                    className="gap-1 text-xs"
                  >
                    {typeInfo.icon}
                    {typeInfo.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{alert.message}</TableCell>
                <TableCell>
                  {alert.acknowledged ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs gap-1">
                      <CheckCheck className="w-3 h-3" /> Đã xử lý
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-500 border-orange-300 text-xs">
                      Chờ xử lý
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {!alert.acknowledged && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      disabled={ackingIds.has(alert.id)}
                      onClick={() => handleAck(alert.id, alert.deviceId)}
                    >
                      {ackingIds.has(alert.id) ? '...' : 'Xác nhận'}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
