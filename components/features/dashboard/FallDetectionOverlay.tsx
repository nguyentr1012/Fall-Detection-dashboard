'use client'

import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle, X } from 'lucide-react'
import { useAlertStore } from '@/store/useAlertStore'
import { api } from '@/services/api'

import { useDevices } from '@/hooks/useDeviceData'

export function FallDetectionOverlay() {
  const alerts = useAlertStore((s) => s.alerts)
  const dismissed = useAlertStore((s) => s.dismissedOverlayAlertIds)
  const dismissOverlay = useAlertStore((s) => s.dismissOverlayAlert)
  const acknowledgeAlert = useAlertStore((s) => s.acknowledgeAlert)
  const qc = useQueryClient()
  const { data: devices = [] } = useDevices()

  const activeAlert = alerts.find(
    (a) => a.type === 'fall_detected' && !a.acknowledged && !dismissed.includes(a.id)
  ) ?? null

  if (!activeAlert) return null

  const device = devices.find(d => d.mac === activeAlert.deviceId || d.id === activeAlert.deviceId)
  const deviceIdToDisplay = device?.id || activeAlert.deviceId
  const displayName = device?.name && device.name !== 'Chưa gán' 
    ? `${deviceIdToDisplay} (${device.name})` 
    : deviceIdToDisplay

  const handleConfirm = () => {
    dismissOverlay(activeAlert.id)
    acknowledgeAlert(activeAlert.id)
    api.acknowledgeAlert(activeAlert.id, activeAlert.deviceId).then(() => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
    }).catch(() => {})
  }

  const handleDismiss = () => {
    dismissOverlay(activeAlert.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-600/95 animate-pulse">
      <div
        className="animate-none bg-red-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-red-400/50"
        style={{ animation: 'none' }}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white tracking-wide">TÉ NGÃ PHÁT HIỆN!</h1>
            <p className="text-red-200 text-sm mt-1">Cần phản ứng ngay lập tức</p>
          </div>
        </div>

        {/* Alert details */}
        <div className="bg-red-800/50 rounded-xl p-4 mb-6 space-y-2 text-sm">
          <div className="flex justify-between text-red-100">
            <span className="opacity-70">Thiết bị:</span>
            <span className="font-semibold">{displayName}</span>
          </div>
          <div className="flex justify-between text-red-100">
            <span className="opacity-70">Thông tin:</span>
            <span className="font-semibold text-right max-w-[200px]">{activeAlert.message}</span>
          </div>
          <div className="flex justify-between text-red-100">
            <span className="opacity-70">Thời gian:</span>
            <span className="font-semibold">
              {new Date(activeAlert.timestamp).toLocaleString('vi-VN')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleConfirm}
            className="w-full flex items-center justify-center gap-2 py-4 bg-white text-red-700 text-lg font-bold rounded-xl hover:bg-red-50 transition-colors shadow-lg"
          >
            <CheckCircle className="w-5 h-5" />
            Xác nhận cứu hộ
          </button>
          <button
            onClick={handleDismiss}
            className="w-full flex items-center justify-center gap-1 py-2 text-red-200 hover:text-white text-sm transition-colors"
          >
            <X className="w-4 h-4" />
            Bỏ qua tạm thời
          </button>
        </div>
      </div>
    </div>
  )
}
