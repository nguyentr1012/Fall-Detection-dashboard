import { DeviceConfig } from '@/components/features/device-detail/DeviceConfig'
import { DeviceSubNav } from '@/components/features/device-detail/DeviceSubNav'

// Next.js 16: params là Promise — bắt buộc await
export default async function DeviceSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Chi tiết thiết bị - Thiết bị {id.replace('device_', '#')}</h1>
        <p className="text-muted-foreground text-sm mt-1">Cài đặt cấu hình ngưỡng cảm biến và thông tin thiết bị</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
        <DeviceSubNav deviceId={id} />
        <div className="p-6">
          <DeviceConfig deviceId={id} />
        </div>
      </div>
    </div>
  )
}
