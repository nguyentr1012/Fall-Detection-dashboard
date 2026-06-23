'use client'
import { Menu } from 'lucide-react'
import { useTelemetryStore } from '@/store/useTelemetryStore'
import { NotificationBell } from './NotificationBell'

interface Props {
  onMenuToggle: () => void
}

export function TopNav({ onMenuToggle }: Props) {
  const mqttConnected = useTelemetryStore(s => s.mqttConnected)

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-3 px-4 shrink-0">
      {/* Hamburger */}
      <button
        onClick={onMenuToggle}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="size-5" />
      </button>

      <div className="flex-1" />

      {/* MQTT status */}
      {mqttConnected ? (
        <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          MQTT: Live
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          MQTT: Reconnecting...
        </div>
      )}

      <NotificationBell />
    </header>
  )
}
