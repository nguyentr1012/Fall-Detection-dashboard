import { HistoryPageClient } from './HistoryPageClient'
import { DeviceSubNav } from '@/components/features/device-detail/DeviceSubNav'

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lịch sử hoạt động - Thiết bị {id.replace('device_', '#')}</h1>
        <p className="text-muted-foreground text-sm mt-1">Timeline chi tiết các sự kiện và chuyển đổi hoạt động của người đeo</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
        <DeviceSubNav deviceId={id} />
        <HistoryPageClient deviceId={id} />
      </div>
    </div>
  )
}
