'use client'
import Link from 'next/link'
import { AlertTriangle, PersonStanding, Sofa, CheckCircle, Download, RefreshCw } from 'lucide-react'
import { useDeviceConfig, useDeviceAlerts } from '@/hooks/useDeviceData'
import { Skeleton } from '@/components/ui/skeleton'
import type { Alert } from '@/src/types'

function ActivityLogItem({ alert }: { alert: Alert }) {
  if (alert.type === 'fall_detected') {
    return (
      <div className="flex gap-3 items-start py-2 border-b border-gray-100 last:border-0">
        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="size-3.5 text-red-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-red-600">
            {new Date(alert.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} Fall Detected
          </p>
          <p className="text-[11px] text-gray-500">{alert.deviceId} — Priority High</p>
        </div>
      </div>
    )
  }
  if (alert.type === 'low_battery') {
    return (
      <div className="flex gap-3 items-start py-2 border-b border-gray-100 last:border-0">
        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
          <Sofa className="size-3.5 text-gray-500" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-700">
            {new Date(alert.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} Low Battery
          </p>
          <p className="text-[11px] text-gray-500">{alert.deviceId}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex gap-3 items-start py-2 border-b border-gray-100 last:border-0">
      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
        <PersonStanding className="size-3.5 text-blue-500" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700">
          {new Date(alert.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} Alert
        </p>
        <p className="text-[11px] text-gray-500">{alert.message || alert.type}</p>
      </div>
    </div>
  )
}

interface Props {
  deviceId: string
}

export function PatientProfile({ deviceId }: Props) {
  const { data: config, isLoading: configLoading } = useDeviceConfig(deviceId)
  const { data: recentAlerts = [], isLoading: alertsLoading } = useDeviceAlerts(deviceId, 4)

  if (configLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  const initials = (config?.wearerName ?? 'NA')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 mb-3">Patient Profile</p>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-2 mb-3">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg">
            {initials}
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900">{config?.wearerName ?? 'Chưa gán'}</p>
            <p className="text-[11px] text-gray-500">ID: #{deviceId.toUpperCase()}</p>
          </div>
        </div>

        {config?.heightCm && (
          <div className="text-xs text-gray-500 text-center mb-3">
            Height: {config.heightCm} cm
          </div>
        )}

        <Link
          href={`/device/${deviceId}`}
          className="block w-full text-center text-sm font-medium bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Edit Health Records
        </Link>
      </div>

      {/* Recent Activity Log */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500">Recent Activity Log</p>
          <button className="text-gray-400 hover:text-gray-600">
            <RefreshCw className="size-3.5" />
          </button>
        </div>

        {alertsLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : recentAlerts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <CheckCircle className="size-8 text-green-400" />
            <p className="text-xs text-gray-400">Chưa có sự kiện nào</p>
          </div>
        ) : (
          <div>
            {recentAlerts.map(a => (
              <ActivityLogItem key={a.id} alert={a} />
            ))}
          </div>
        )}

        <button className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 border border-blue-200 py-2 rounded-lg hover:bg-blue-50 transition-colors">
          <Download className="size-3.5" />
          Download Activity Report
        </button>
      </div>
    </div>
  )
}
