'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertFilters } from '@/components/features/alerts/AlertFilters'
import { AlertHistoryTable } from '@/components/features/alerts/AlertHistoryTable'
import { useCombinedAlerts, useDevices } from '@/hooks/useDeviceData'
import type { Alert } from '@/src/types'

export default function AlertsPage() {
  const [deviceFilter, setDeviceFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')

  const { data: alerts = [], isLoading: alertsLoading } = useCombinedAlerts(200)
  const { data: devices = [] } = useDevices()

  const filteredAlerts = alerts.filter((a: Alert) => {
    if (deviceFilter !== 'all' && a.deviceId !== deviceFilter) return false
    if (typeFilter !== 'all' && a.type !== typeFilter) return false
    if (dateFilter && !a.timestamp.startsWith(dateFilter)) return false
    return true
  })

  const unresolvedCount = alerts.filter((a) => !a.acknowledged).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lịch sử cảnh báo</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unresolvedCount > 0 ? (
              <span className="text-orange-500 font-medium">{unresolvedCount} chờ xử lý · </span>
            ) : null}
            {alerts.length} tổng cộng
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <CardTitle className="text-base">Danh sách cảnh báo</CardTitle>
            <AlertFilters
              devices={devices}
              deviceFilter={deviceFilter}
              typeFilter={typeFilter}
              dateFilter={dateFilter}
              onDeviceChange={setDeviceFilter}
              onTypeChange={setTypeFilter}
              onDateChange={setDateFilter}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <AlertHistoryTable alerts={filteredAlerts} isLoading={alertsLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
