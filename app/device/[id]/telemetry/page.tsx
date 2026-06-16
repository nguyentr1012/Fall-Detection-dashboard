import { TelemetryPageClient } from './TelemetryPageClient'
import { DeviceSubNav } from '@/components/features/device-detail/DeviceSubNav'

export default async function TelemetryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nhật ký Telemetry - Thiết bị {id.replace('device_', '#')}</h1>
        <p className="text-muted-foreground text-sm mt-1">Lịch sử dữ liệu thô từ InfluxDB</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
        <DeviceSubNav deviceId={id} />
        <TelemetryPageClient deviceId={id} />
      </div>
    </div>
  )
}
