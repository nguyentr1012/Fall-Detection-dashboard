'use client'
import { useDeviceTimeline, useDeviceTelemetry } from '@/hooks/useDeviceData'

export function ActivityHistory({ deviceId }: { deviceId: string }) {
  const { data: timeline = [], isLoading: isLoadingTimeline } = useDeviceTimeline(deviceId, 20)
  const { data: telemetry = [], isLoading: isLoadingTelemetry } = useDeviceTelemetry(deviceId, 20)

  const isLoading = isLoadingTimeline || isLoadingTelemetry

  // Merge timeline (alerts/events) and telemetry into one sorted array
  const mergedData = [
    ...timeline.map(t => ({
      id: t.id,
      type: t.type, // 'ALERT' or 'EVENT'
      title: t.title,
      description: t.description,
      timestamp: t.created_at,
    })),
    ...telemetry.map((t: any, idx) => ({
      id: `tel_${idx}`,
      type: 'TELEMETRY',
      title: `Trạng thái: ${t.state || 'N/A'}`,
      description: `Battery: ${t.battery}%, Steps: ${t.steps}, AI Pred: ${t.ai_pred}`,
      timestamp: t.time || t.created_at || new Date().toISOString(),
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border">
      <h2 className="text-sm font-semibold mb-4">Activity History</h2>
      {isLoading ? (
        <div className="text-xs text-gray-500">Đang tải dữ liệu...</div>
      ) : mergedData.length === 0 ? (
        <div className="text-xs text-gray-500">Chưa có hoạt động nào.</div>
      ) : (
        <div className="space-y-4">
          {mergedData.map(item => (
            <div key={item.id} className="flex gap-3 text-sm border-b pb-3 last:border-0">
              <div className="w-16 shrink-0 text-xs text-gray-500 pt-0.5">
                {new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div>
                <div className="font-medium flex items-center gap-2">
                  {item.type === 'ALERT' ? (
                    <span className="text-red-600 font-bold">⚠️ {item.title}</span>
                  ) : item.type === 'TELEMETRY' ? (
                    <span className="text-blue-600">{item.title}</span>
                  ) : (
                    <span className="text-gray-800">{item.title}</span>
                  )}
                </div>
                {item.description && (
                  <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
