'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Props {
  deviceId: string
}

export function DeviceSubNav({ deviceId }: Props) {
  const pathname = usePathname()

  const tabs = [
    {
      label: 'Lịch sử hoạt động',
      href: `/device/${deviceId}/history`,
      active: pathname.endsWith(`/device/${deviceId}/history`),
    },
    {
      label: 'Nhật ký Telemetry (Raw)',
      href: `/device/${deviceId}/telemetry`,
      active: pathname.endsWith(`/device/${deviceId}/telemetry`),
    },
    {
      label: 'Chỉ số thiết bị (Vitals)',
      href: `/device/${deviceId}/vitals`,
      active: pathname.endsWith(`/device/${deviceId}/vitals`),
    },
    {
      label: 'Cấu hình thiết bị',
      href: `/device/${deviceId}`,
      // active if it matches exactly /device/[id] and does not end with sub-routes
      active: pathname === `/device/${deviceId}`,
    },
  ]

  return (
    <div className="flex border-b border-gray-200 bg-white px-4 py-2 rounded-t-xl gap-2 shrink-0">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
            tab.active
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
