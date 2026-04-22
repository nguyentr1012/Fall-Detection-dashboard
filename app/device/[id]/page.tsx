import { AlertHistory } from '@/components/features/device-detail/AlertHistory'
import { DeviceConfig } from '@/components/features/device-detail/DeviceConfig'

// Next.js 16: params là Promise — bắt buộc await
export default async function DevicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Chi tiết thiết bị</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AlertHistory deviceId={id} />
        </div>
        <div>
          <DeviceConfig deviceId={id} />
        </div>
      </div>
    </div>
  )
}
