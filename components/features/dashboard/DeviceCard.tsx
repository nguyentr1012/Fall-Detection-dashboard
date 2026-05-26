import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Device, Alert } from '@/src/types'

type DeviceStatus = 'online' | 'offline' | 'alert' | 'low'

function getEffectiveStatus(device: Device, criticalAlerts: Alert[]): DeviceStatus {
  if (device.status === 'offline') return 'offline'
  const hasCritical = criticalAlerts.some(
    a => {
      if (a.deviceId !== device.id || a.acknowledged || a.severity !== 'critical') return false
      const hoursSince = (Date.now() - new Date(a.timestamp).getTime()) / (1000 * 60 * 60)
      return hoursSince <= 24
    }
  )
  if (hasCritical) return 'alert'
  if (device.batteryLevel !== undefined && device.batteryLevel < 20) return 'low'
  return 'online'
}

const STATUS_CONFIG: Record<DeviceStatus, { label: string; dot: string; text: string; bg: string }> = {
  online:  { label: 'ONLINE',   dot: 'bg-green-500',  text: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
  alert:   { label: 'ALERT',    dot: 'bg-red-500',    text: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
  low:     { label: 'LOW',      dot: 'bg-orange-400', text: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' },
  offline: { label: 'OFFLINE',  dot: 'bg-gray-400',   text: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200' },
}

function BatteryBar({ level, status }: { level: number; status: DeviceStatus }) {
  const barColor =
    status === 'alert' ? 'bg-red-500' :
    level < 20 ? 'bg-orange-400' :
    'bg-green-500'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Battery</span>
        <span className={cn('text-xs font-semibold', level < 20 ? 'text-orange-500' : 'text-gray-700')}>
          {level}%
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${level}%` }} />
      </div>
    </div>
  )
}

interface Props {
  device: Device
  criticalAlerts: Alert[]
  isSelected: boolean
  onSelect: (id: string) => void
}

export const DeviceCard = React.memo(function DeviceCard({
  device, criticalAlerts, isSelected, onSelect,
}: Props) {
  const effectiveStatus = getEffectiveStatus(device, criticalAlerts)
  const cfg = STATUS_CONFIG[effectiveStatus]
  const deviceNum = device.id.replace('dev_', '#').replace('device_', '#').toUpperCase()

  return (
    <div
      onClick={() => onSelect(device.id)}
      className={cn(
        'bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md',
        isSelected
          ? 'border-blue-400 shadow-md'
          : effectiveStatus === 'alert'
          ? 'border-red-300'
          : 'border-gray-200'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0">
          <p className="text-[11px] text-gray-400">Device {deviceNum}</p>
          <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{device.name}</p>
          <p className="text-xs text-gray-500 truncate">{device.location}</p>
        </div>
        {/* Status Badge */}
        <span className={cn(
          'flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ml-2',
          cfg.bg, cfg.text
        )}>
          {effectiveStatus === 'low'
            ? <span className="text-orange-500">⚡</span>
            : <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
          }
          {cfg.label}
        </span>
      </div>

      {/* Battery */}
      <div className="mb-3">
        {device.batteryLevel !== undefined ? (
          <BatteryBar level={device.batteryLevel} status={effectiveStatus} />
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Battery</span>
            <span className="text-xs text-gray-400">—</span>
          </div>
        )}
      </div>

      {/* Links */}
      <div className="space-y-1 border-t border-gray-100 pt-2">
        <Link
          href={`/data-collection`}
          onClick={e => e.stopPropagation()}
          className="block text-xs text-blue-600 hover:underline font-medium"
        >
          View IMU Log
        </Link>
        <Link
          href={`/device/${device.id}`}
          onClick={e => e.stopPropagation()}
          className="block text-xs text-gray-600 hover:text-gray-900"
        >
          Activity History
        </Link>
        <Link
          href={`/device/${device.id}`}
          onClick={e => e.stopPropagation()}
          className="block text-xs text-gray-600 hover:text-gray-900"
        >
          Detailed Vitals
        </Link>
      </div>
    </div>
  )
})
