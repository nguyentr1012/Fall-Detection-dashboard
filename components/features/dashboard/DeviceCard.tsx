import React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Device } from '@/src/types'

export const DeviceCard = React.memo(function DeviceCard({ device }: { device: Device }) {
  return (
    <Link href={`/device/${device.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm truncate pr-2">{device.name}</span>
            <StatusBadge status={device.status} />
          </div>
          <p className="text-xs text-muted-foreground">{device.location} · {device.model}</p>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {device.lastAlert
              ? `Cảnh báo: ${device.lastAlert.message}`
              : 'Chưa có cảnh báo'}
          </p>
          <p className="text-xs text-muted-foreground">
            Cập nhật: {new Date(device.lastSeen).toLocaleString('vi-VN')}
          </p>
          <p className="text-xs text-muted-foreground">v{device.firmwareVersion}</p>
        </CardContent>
      </Card>
    </Link>
  )
})
