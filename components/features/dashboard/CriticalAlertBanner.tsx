'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Phone, PhoneCall } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/services/api'
import { useAlertStore } from '@/store/useAlertStore'
import { useDevices } from '@/hooks/useDeviceData'
import type { Alert } from '@/src/types'

function formatRelativeTime(isoTimestamp: string): string {
  const diff = Date.now() - new Date(isoTimestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'vừa xong'
  if (mins < 60) return `${mins} mins ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(isoTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface Props {
  alert: Alert
}

export function CriticalAlertBanner({ alert }: Props) {
  const qc = useQueryClient()
  const { acknowledgeAlert } = useAlertStore()
  const { data: devices = [] } = useDevices()

  const { mutate: resolve, isPending } = useMutation({
    mutationFn: () => api.acknowledgeAlert(alert.id, alert.deviceId),
    onSuccess: () => {
      acknowledgeAlert(alert.id)
      qc.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Đã đánh dấu xử lý xong.')
    },
    onError: () => toast.error('Không thể cập nhật, thử lại.'),
  })

  const device = devices.find(d => d.mac === alert.deviceId || d.id === alert.deviceId)
  const deviceIdToDisplay = device?.id || alert.deviceId
  const displayName = device?.name && device.name !== 'Chưa gán' 
    ? `${deviceIdToDisplay} (${device.name})` 
    : deviceIdToDisplay

  return (
    <div className="flex items-start gap-4 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
      {/* Icon */}
      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
        <AlertTriangle className="size-5 text-red-600" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-red-700">Critical Alert: Fall Detected</h2>
            <p className="text-sm text-red-600 mt-0.5">
              {displayName} — {alert.message || 'Potential fall incident detected. Emergency services are on standby. Caregiver alerted.'}
            </p>
          </div>
          <span className="text-xs text-red-500 whitespace-nowrap shrink-0">
            {formatRelativeTime(alert.timestamp)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button
            onClick={() => resolve()}
            disabled={isPending}
            className="px-4 py-1.5 text-sm font-medium border border-red-400 text-red-700 bg-white rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Đang xử lý…' : 'Mark as Resolved'}
          </button>
          <button
            onClick={() => toast.info('Đang liên hệ người thân…')}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Phone className="size-3.5" />
            Contact Next of Kin
          </button>
          <button
            onClick={() => toast.error('Đang gọi dịch vụ khẩn cấp…')}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium border border-red-400 text-red-700 bg-white rounded-lg hover:bg-red-50 transition-colors"
          >
            <PhoneCall className="size-3.5" />
            Call Emergency Service
          </button>
        </div>
      </div>
    </div>
  )
}
