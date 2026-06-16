'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, AlertTriangle, Battery, Wifi } from 'lucide-react'
import Link from 'next/link'
import { useCombinedAlerts } from '@/hooks/useDeviceData'
import type { Alert } from '@/src/types'

const TYPE_LABEL: Record<string, { label: string; icon: React.ReactNode }> = {
  fall_detected: { label: 'Té ngã', icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
  low_battery: { label: 'Pin yếu', icon: <Battery className="w-4 h-4 text-orange-500" /> },
  connection_lost: { label: 'Mất kết nối', icon: <Wifi className="w-4 h-4 text-gray-500" /> },
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { data: alerts = [] } = useCombinedAlerts(50)

  const unresolvedAlerts = alerts.filter((a: Alert) => !a.acknowledged)
  const topAlerts = unresolvedAlerts.slice(0, 5)
  const unreadCount = unresolvedAlerts.length

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors relative"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse border border-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-semibold text-sm text-gray-900">Cảnh báo mới</h3>
            {unreadCount > 0 && (
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                {unreadCount} chưa xử lý
              </span>
            )}
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {topAlerts.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {topAlerts.map((alert: Alert) => {
                  const typeInfo = TYPE_LABEL[alert.type] ?? { label: alert.type, icon: <AlertTriangle className="w-4 h-4 text-gray-500" /> }
                  return (
                    <Link
                      key={alert.id}
                      href="/alerts"
                      onClick={() => setIsOpen(false)}
                      className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{typeInfo.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {typeInfo.label} - <span className="font-mono">{alert.deviceId}</span>
                          </p>
                          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                            {alert.message}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(alert.timestamp).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                Không có cảnh báo mới nào
              </div>
            )}
          </div>

          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <Link
              href="/alerts"
              onClick={() => setIsOpen(false)}
              className="block w-full text-center text-xs font-medium text-blue-600 hover:text-blue-700 py-1.5"
            >
              Xem tất cả lịch sử cảnh báo
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
