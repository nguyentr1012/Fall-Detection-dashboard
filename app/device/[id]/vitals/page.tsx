import { VitalsPageClient } from './VitalsPageClient'
import { DeviceSubNav } from '@/components/features/device-detail/DeviceSubNav'

export default async function VitalsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Chỉ số thiết bị (Vitals) - Thiết bị {id.replace('device_', '#')}</h1>
        <p className="text-muted-foreground text-sm mt-1">Giám sát dung lượng pin, cường độ tín hiệu sóng di động RSSI và sức khỏe phần cứng</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
        <DeviceSubNav deviceId={id} />
        <VitalsPageClient deviceId={id} />
      </div>
    </div>
  )
}
