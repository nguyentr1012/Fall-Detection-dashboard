'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDeviceTimeline, useDeviceTelemetry } from '@/hooks/useDeviceData'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceDot,
  CartesianGrid,
} from 'recharts'

interface Props {
  deviceId: string
}

// Map activity state to numeric value for Step Chart
const STATE_MAP: Record<string, { value: number; label: string }> = {
  'standing': { value: 0, label: 'Đứng' },
  'standing_stand': { value: 0, label: 'Đứng' },
  'sitting': { value: 0, label: 'Ngồi' },
  'sit': { value: 0, label: 'Ngồi' },
  'stand': { value: 0, label: 'Đứng' },
  'transition_stand_sit': { value: 0.5, label: 'Chuyển Đứng-Ngồi' },
  'transition_sit_lie': { value: 0.5, label: 'Chuyển Ngồi-Nằm' },
  'walk': { value: 1, label: 'Đi bộ' },
  'walking': { value: 1, label: 'Đi bộ' },
  'run': { value: 2, label: 'Chạy' },
  'running': { value: 2, label: 'Chạy' },
  'fall': { value: 3, label: 'Ngã ⚠️' },
  'falling': { value: 3, label: 'Ngã ⚠️' },
  'FALL_DETECTED': { value: 3, label: 'Ngã ⚠️' },
}

function getStateInfo(state: string) {
  const normalized = (state || '').toLowerCase()
  return STATE_MAP[normalized] || { value: 0, label: state || 'Đứng/Ngồi' }
}

export function HistoryPageClient({ deviceId }: { deviceId: string }) {
  const { data: timeline = [], isLoading: isLoadingTimeline } = useDeviceTimeline(deviceId, 30)
  const { data: telemetry = [], isLoading: isLoadingTelemetry } = useDeviceTelemetry(deviceId, 100)

  const isLoading = isLoadingTimeline || isLoadingTelemetry

  // 1. Process telemetry data for timeline chart
  // We reverse telemetry to display in chronological order (left to right)
  const chartRawData = [...telemetry]
    .reverse()
    .map((t: any) => {
      const stateInfo = getStateInfo(t.ai_pred || t.state)
      const date = new Date(t.timestamp)
      const timeStr = !isNaN(date.getTime())
        ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '-'
      return {
        timestamp: t.timestamp,
        timeStr,
        value: stateInfo.value,
        label: stateInfo.label,
        ai_conf: t.ai_conf != null ? Math.round(t.ai_conf * 100) : null,
      }
    })

  // Filter out falls to draw reference dots
  const falls = chartRawData.filter((d) => d.value === 3)

  // 2. Merge timeline (alerts/events from PostgreSQL) and telemetry logs for text view
  const mergedLogs = [
    ...timeline.map((t) => ({
      id: t.id,
      type: t.type, // 'ALERT' or 'EVENT'
      title: t.title === 'FALL_DETECTED' ? 'PHÁT HIỆN TÉ NGÃ ⚠️' : t.title,
      description: t.description || 'Hệ thống đã ghi nhận tín hiệu khẩn cấp.',
      timestamp: t.created_at,
    })),
    ...telemetry
      .filter((t: any) => (t.ai_pred || t.state) && (t.ai_pred || t.state) !== 'UNKNOWN')
      .map((t: any, idx) => {
        const stateInfo = getStateInfo(t.ai_pred || t.state)
        return {
          id: `tel_${idx}`,
          type: 'TELEMETRY',
          title: `Hoạt động: ${stateInfo.label}`,
          description: `Độ tin cậy AI: ${t.ai_conf != null ? (t.ai_conf * 100).toFixed(0) : 0}%, Số bước: ${t.steps || 0}`,
          timestamp: t.timestamp,
        }
      }),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="p-6 space-y-6">
      {/* Upper: Timeline Graph */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Trực quan hóa Hoạt động & Té ngã</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dữ liệu trạng thái hoạt động thực tế của người đeo theo trục thời gian (Bậc thang trạng thái)
          </p>
        </CardHeader>
        <CardContent className="h-[280px]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Đang tải dữ liệu biểu đồ...
            </div>
          ) : chartRawData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed border-gray-100 rounded-lg">
              Chưa có dữ liệu vận động để vẽ biểu đồ
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartRawData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="timeStr"
                  tick={{ fontSize: 10 }}
                  minTickGap={20}
                />
                <YAxis
                  domain={[0, 3]}
                  ticks={[0, 1, 2, 3]}
                  tickFormatter={(val) => {
                    if (val === 0) return 'Nghỉ'
                    if (val === 1) return 'Đi bộ'
                    if (val === 2) return 'Chạy'
                    if (val === 3) return 'NGÃ'
                    return ''
                  }}
                  tick={{ fontSize: 11, fontWeight: 'bold' }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-md space-y-1">
                          <p className="font-semibold text-gray-700">{data.timeStr}</p>
                          <p className="text-xs">Trạng thái: <span className="font-bold text-blue-600">{data.label}</span></p>
                          {data.ai_conf !== null && (
                            <p className="text-xs text-gray-500">Độ tin cậy: {data.ai_conf}%</p>
                          )}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                {/* Area line drawn as a step sequence to represent states */}
                <Area
                  type="stepAfter"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
                {/* Custom warning markers for Fall detected */}
                {falls.map((fallPoint, index) => (
                  <ReferenceDot
                    key={index}
                    x={fallPoint.timeStr}
                    y={3}
                    r={8}
                    fill="#ef4444"
                    stroke="#fff"
                    strokeWidth={2}
                    className="animate-ping"
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Lower: Merged History logs (Alerts & Telemetry logs) */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold">Nhật ký hoạt động chi tiết</CardTitle>
          </CardHeader>
          <CardContent className="h-[450px] overflow-auto p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Đang tải nhật ký...</div>
            ) : mergedLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Chưa có hoạt động được ghi nhận.</div>
            ) : (
              <div className="divide-y">
                {mergedLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-4 flex gap-4 text-sm hover:bg-muted/10 transition-colors ${
                      log.type === 'ALERT' ? 'bg-red-50/20' : ''
                    }`}
                  >
                    <div className="w-24 shrink-0 font-mono text-xs text-muted-foreground pt-0.5">
                      {new Date(log.timestamp).toLocaleString('vi-VN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold flex items-center gap-2">
                        {log.type === 'ALERT' ? (
                          <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            ⚠️ CẢNH BÁO
                          </span>
                        ) : log.type === 'EVENT' ? (
                          <span className="text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            SỰ KIỆN
                          </span>
                        ) : (
                          <span className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            VẬN ĐỘNG
                          </span>
                        )}
                        <span className="text-gray-900">{log.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{log.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
