'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getMqttClient } from '@/lib/mqtt-client'
import { playAlarm } from '@/lib/alarm'
import { useAlertStore } from '@/store/useAlertStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useTelemetryStore } from '@/store/useTelemetryStore'
import { toast } from 'sonner'

export function GlobalMqttInit() {
  const addAlert = useAlertStore((s) => s.addAlert)
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const soundEnabledRef = useRef(soundEnabled)
  soundEnabledRef.current = soundEnabled
  const updateTelemetry = useTelemetryStore((s) => s.updateTelemetry)
  const setMqttConnected = useTelemetryStore((s) => s.setMqttConnected)
  const qc = useQueryClient()

  useEffect(() => {
    const client = getMqttClient()
    client.connect('global-monitor')

    // Debounce trạng thái "mất kết nối": reconnect bình thường (~3s) KHÔNG được
    // làm badge nhấp nháy. Báo connected ngay, nhưng chỉ báo disconnected nếu mất
    // kết nối liên tục quá DISCONNECT_GRACE_MS.
    const DISCONNECT_GRACE_MS = 5000
    let disconnectTimer: ReturnType<typeof setTimeout> | null = null
    const offConnectionChange = client.onConnectionChange((connected) => {
      if (connected) {
        if (disconnectTimer) { clearTimeout(disconnectTimer); disconnectTimer = null }
        setMqttConnected(true)
      } else if (!disconnectTimer) {
        disconnectTimer = setTimeout(() => {
          disconnectTimer = null
          setMqttConnected(false)
        }, DISCONNECT_GRACE_MS)
      }
    })

    client.subscribe(
      '*',
      undefined, // KHÔNG đăng ký batch — global không cần luồng IMU 100Hz
      (alert) => {
        addAlert(alert) // chỉ cho overlay + chuông real-time, KHÔNG phải nguồn bảng log
        if (soundEnabledRef.current && alert.type === 'fall_detected') {
          playAlarm()
        }
        if (alert.type === 'fall_detected') {
          // Backend đã persist alert này khi nhận MQTT. Refetch để bảng log hiển thị
          // bản ghi DB (1 dòng duy nhất) ngay, thay vì chờ poll 30s. Trễ nhẹ tránh race.
          setTimeout(() => qc.invalidateQueries({ queryKey: ['alerts'] }), 1500)
        }
      },
      (deviceId, data) => updateTelemetry(deviceId, { ...data, last_seen: Date.now() }),
      (deviceId, event) => {
        // Chỉ hiện toast cảnh báo cho Pin yếu và Lỗi phần cứng, không hiện overlay còi hú
        const title = event.event_type === 'LOW_BATTERY' ? '🔋 Pin yếu' : '🔧 Lỗi thiết bị'
        const desc = `${deviceId}: ${event.description || event.event_type}`
        if (event.event_type === 'LOW_BATTERY') {
          toast.warning(title, { description: desc, duration: 6000 })
        } else {
          toast.error(title, { description: desc, duration: 8000 })
        }
        // Refetch timeline (nếu người dùng đang xem trang chi tiết có chứa timeline)
        setTimeout(() => qc.invalidateQueries({ queryKey: ['timeline'] }), 1500)
      }
    )
    return () => {
      if (disconnectTimer) { clearTimeout(disconnectTimer); disconnectTimer = null }
      offConnectionChange()
      client.unsubscribe('*')
      client.disconnect() // đối xứng với connect() ở trên (ref-count)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
