'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StepsChart } from '@/components/features/alerts/StepsChart'
import { DistanceChart } from '@/components/features/alerts/DistanceChart'
import { useDeviceTelemetry, useStepsHistory } from '@/hooks/useDeviceData'

const CHART_DAYS_OPTIONS = [7, 14, 30]

const formatTimestamp = (timestamp: string | Date) => {
  if (!timestamp) return '-'
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return '-'
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${day}/${month} ${hours}:${minutes}:${seconds}`
  } catch (e) {
    return '-'
  }
}

export function TelemetryPageClient({ deviceId }: { deviceId: string }) {
  const [chartDays, setChartDays] = useState(7)
  const { data: telemetryLogs = [], isLoading: logsLoading } = useDeviceTelemetry(deviceId, 100)
  const { data: stepsHistory = [], isLoading: stepsLoading } = useStepsHistory(chartDays, deviceId)

  return (
    <div className="p-6 space-y-6">

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Left: Telemetry Log Table */}
        <Card className="flex flex-col h-[800px]">
          <CardHeader className="pb-3 shrink-0">
            <CardTitle className="text-base">Dữ liệu Telemetry ({telemetryLogs.length} records)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0 overflow-auto">
            {logsLoading ? (
              <div className="p-4 text-center text-muted-foreground">Đang tải...</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 bg-muted/50 text-muted-foreground text-xs uppercase z-10">
                  <tr>
                    <th className="px-4 py-3 font-medium">Thời gian</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 font-medium">Pin</th>
                    <th className="px-4 py-3 font-medium">Bước chân</th>
                    <th className="px-4 py-3 font-medium">Quãng đường</th>
                    <th className="px-4 py-3 font-medium">AI Dự đoán</th>
                    <th className="px-4 py-3 font-medium">AI Conf</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {telemetryLogs.map((log: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-[11px] whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-2">{log.state || '-'}</td>
                      <td className="px-4 py-2">{log.battery_pct != null ? `${log.battery_pct}%` : '-'}</td>
                      <td className="px-4 py-2">{log.steps ?? '-'}</td>
                      <td className="px-4 py-2">{log.distance_m != null ? `${log.distance_m.toFixed(1)}m` : '-'}</td>
                      <td className="px-4 py-2 font-medium text-blue-600">{log.ai_pred || '-'}</td>
                      <td className="px-4 py-2">
                        {log.ai_conf != null ? `${(log.ai_conf * 100).toFixed(0)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                  {telemetryLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center p-8 text-muted-foreground">
                        Không có dữ liệu
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
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
