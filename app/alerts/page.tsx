'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertFilters } from '@/components/features/alerts/AlertFilters'
import { AlertHistoryTable } from '@/components/features/alerts/AlertHistoryTable'
import { StepsChart } from '@/components/features/alerts/StepsChart'
import { DistanceChart } from '@/components/features/alerts/DistanceChart'
import { useAlerts, useDevices, useStepsHistory } from '@/hooks/useDeviceData'
import type { Alert } from '@/src/types'

const CHART_DAYS_OPTIONS = [7, 14, 30]

export default function AlertsPage() {
  const [deviceFilter, setDeviceFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [chartDays, setChartDays] = useState(7)

  const { data: alerts = [], isLoading: alertsLoading } = useAlerts(200)
  const { data: devices = [] } = useDevices()
  const { data: stepsHistory = [], isLoading: stepsLoading } = useStepsHistory(chartDays)

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

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Left: Table */}
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

        {/* Right: Charts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Phân tích hoạt động</span>
            <div className="flex gap-1">
              {CHART_DAYS_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setChartDays(d)}
                  className={`px-2 py-1 text-xs rounded ${
                    chartDays === d
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {d}N
                </button>
              ))}
            </div>
          </div>
          <StepsChart data={stepsHistory} isLoading={stepsLoading} />
          <DistanceChart data={stepsHistory} isLoading={stepsLoading} />
        </div>
      </div>
    </div>
  )
}
