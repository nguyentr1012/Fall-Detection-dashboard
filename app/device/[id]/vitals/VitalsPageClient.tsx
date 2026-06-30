'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDeviceTelemetry, useDevice } from '@/hooks/useDeviceData'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts'

interface Props {
  deviceId: string
}

function getSignalLabel(rssi: number | null | undefined) {
  if (rssi == null || rssi === 0 || rssi === 99) return { text: 'Không có tín hiệu / Mất sóng', color: 'text-red-500' }
  // Xử lý cả 2 trường hợp: CSQ (0-31) hoặc WiFi RSSI (-100 đến -30)
  if (rssi > 0) {
    if (rssi <= 9) return { text: 'Tín hiệu yếu (Chập chờn)', color: 'text-red-400' }
    if (rssi <= 14) return { text: 'Tín hiệu trung bình (Ổn định)', color: 'text-yellow-500' }
    if (rssi <= 19) return { text: 'Tín hiệu tốt', color: 'text-green-500' }
    return { text: 'Tín hiệu rất tốt (Mạnh)', color: 'text-blue-500' }
  } else {
    if (rssi < -80) return { text: 'Tín hiệu yếu (Chập chờn)', color: 'text-red-400' }
    if (rssi < -70) return { text: 'Tín hiệu trung bình (Ổn định)', color: 'text-yellow-500' }
    if (rssi < -60) return { text: 'Tín hiệu tốt', color: 'text-green-500' }
    return { text: 'Tín hiệu rất tốt (Mạnh)', color: 'text-blue-500' }
  }
}

export function VitalsPageClient({ deviceId }: { deviceId: string }) {
  const { data: device, isLoading: isLoadingDevice } = useDevice(deviceId)
  const { data: telemetry = [], isLoading: isLoadingTelemetry } = useDeviceTelemetry(deviceId, 100)

  const isLoading = isLoadingDevice || isLoadingTelemetry

  // Process data for charts
  const chartData = [...telemetry]
    .reverse()
    .map((t: any) => {
      const date = new Date(t.timestamp)
      const timeStr = !isNaN(date.getTime())
        ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '-'
      return {
        timeStr,
        battery: t.battery_pct ?? 0,
        // InfluxDB returns rssi field which represents SIM CSQ
        rssi: t.rssi != null ? t.rssi : null,
      }
    })

  // Latest status values
  const latestTelemetry = telemetry[0] || {}
  const currentBattery = latestTelemetry.battery_pct ?? device?.batteryLevel ?? 0
  const currentRssi = latestTelemetry.rssi ?? device?.last_rssi ?? null;
  
  const isWifi = currentRssi != null && currentRssi < 0;

  const signalInfo = getSignalLabel(currentRssi)

  return (
    <div className="p-6 space-y-6">
      {/* Realtime Status Summary Widgets */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Dung lượng Pin</p>
              <h3 className="text-2xl font-bold mt-1">{currentBattery}%</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {currentBattery < 20 ? '⚠️ Yêu cầu sạc thiết bị' : 'Trạng thái bình thường'}
              </p>
            </div>
            <span className="text-3xl">🔋</span>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {isWifi ? 'Tín hiệu mạng (WiFi)' : 'Tín hiệu di động (CSQ)'}
              </p>
              <h3 className="text-2xl font-bold mt-1">
                {currentRssi != null && currentRssi !== 0 && currentRssi !== 99 
                  ? (currentRssi > 0 ? `${currentRssi} / 31` : `${currentRssi} dBm`) 
                  : '—'}
              </h3>
              <p className={`text-[11px] font-semibold mt-0.5 ${signalInfo.color}`}>
                {signalInfo.text}
              </p>
            </div>
            <span className="text-3xl">📶</span>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Trạng thái Phần cứng</p>
              <h3 className="text-xl font-bold mt-1 truncate">
                {device?.status === 'online' ? (
                  <span className="text-green-600">Đang trực tuyến 🟢</span>
                ) : (
                  <span className="text-gray-500">Ngoại tuyến 🔴</span>
                )}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Mạng kết nối: {isWifi ? 'WiFi' : '4G LTE'}
              </p>
            </div>
            <span className="text-3xl">⚙️</span>
          </CardContent>
        </Card>
      </div>

      {/* Charts section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Battery Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Biểu đồ Hao pin (Battery Trend)</CardTitle>
            <p className="text-xs text-muted-foreground">Theo dõi mức hao hụt pin của thiết bị wearable qua thời gian</p>
          </CardHeader>
          <CardContent className="h-[250px]">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Đang tải...</div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed border-gray-100 rounded-lg">
                Chưa có dữ liệu lịch sử Pin
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="timeStr" tick={{ fontSize: 10 }} minTickGap={20} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Line
                    type="monotone"
                    dataKey="battery"
                    name="Pin"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* RSSI Signal Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Cường độ sóng (RSSI Trend)</CardTitle>
            <p className="text-xs text-muted-foreground">Lịch sử thu sóng kết nối (WiFi/4G) theo thời gian</p>
          </CardHeader>
          <CardContent className="h-[250px]">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Đang tải...</div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed border-gray-100 rounded-lg">
                Chưa có dữ liệu sóng mạng di động
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRssi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="timeStr" tick={{ fontSize: 10 }} minTickGap={20} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v) => {
                      const n = typeof v === 'number' ? v : Number(v)
                      return [n > 0 ? `${n} / 31` : `${n} dBm`, 'Mức sóng'] as [string, string]
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rssi"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRssi)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
