'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { useDevices, useSaveRecording, useSendDeviceCommand } from '@/hooks/useDeviceData'
import { useMqtt } from '@/hooks/useMqtt'
import { DeviceSelector } from '@/components/features/data-collection/DeviceSelector'
import { ControlPanel } from '@/components/features/data-collection/ControlPanel'
import { AccelChart } from '@/components/features/data-collection/AccelChart'
import { GyroChart } from '@/components/features/data-collection/GyroChart'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { computeSVM, downsample, exportToCSV, downloadCSV } from '@/lib/utils'
import type { ActivityLabel, AccelChartPoint, GyroChartPoint, IMUSample } from '@/src/types'

const MAX_CHART_POINTS = 100
const MAX_SAMPLES = 30_000 // 5 phút × 60s × 100Hz

export default function DataCollectionPage() {
  const { data: devices = [] } = useDevices()
  const { mutate: saveRecording } = useSaveRecording()

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [label, setLabel] = useState<ActivityLabel>('walk')
  const [sampleCount, setSampleCount] = useState(0)
  const [accelData, setAccelData] = useState<AccelChartPoint[]>([])
  const [gyroData, setGyroData] = useState<GyroChartPoint[]>([])

  // useRef — tránh re-render 100Hz khi push data
  const recordBuffer = useRef<IMUSample[]>([])
  const isRecordingRef = useRef(false)
  const startTimeRef = useRef(0)

  const { isConnected, lastBatch } = useMqtt(selectedDeviceId)
  // B5: start/stop_stream đi qua backend (HTTP) thay vì FE publish MQTT thẳng.
  const { mutate: sendCommand, isPending: commandPending } = useSendDeviceCommand()

  // Xử lý batch MQTT (chạy mỗi 500ms = 2Hz)
  useEffect(() => {
    if (!lastBatch) return

    // Monitor flow: downsample 100Hz → 10Hz (50 samples → 5 điểm)
    const downsampled = downsample(lastBatch.samples, 10)

    setAccelData(prev => [
      ...prev,
      ...downsampled.map(s => ({
        t: s.timestamp,
        ax: s.ax, ay: s.ay, az: s.az,
        svm: computeSVM(s.ax, s.ay, s.az),
      })),
    ].slice(-MAX_CHART_POINTS))

    setGyroData(prev => [
      ...prev,
      ...downsampled.map(s => ({ t: s.timestamp, gx: s.gx, gy: s.gy, gz: s.gz })),
    ].slice(-MAX_CHART_POINTS))

    // Record flow: lưu full 100Hz vào buffer (không setState)
    if (isRecordingRef.current) {
      recordBuffer.current.push(...lastBatch.samples)
      setSampleCount(recordBuffer.current.length)

      // Auto-stop khi đạt 5 phút
      if (recordBuffer.current.length >= MAX_SAMPLES) {
        handleStop(true)
      }
    }
  }, [lastBatch])

  const handleStart = useCallback(() => {
    if (!selectedDeviceId) return
    recordBuffer.current = []
    setSampleCount(0)
    startTimeRef.current = Date.now()
    // Chỉ vào trạng thái recording SAU khi backend xác nhận đã publish lệnh.
    sendCommand({ deviceId: selectedDeviceId, action: 'start_stream' }, {
      onSuccess: () => {
        isRecordingRef.current = true
        setIsRecording(true)
      },
      onError: () => toast.error('Không gửi được lệnh bắt đầu stream, thử lại.'),
    })
  }, [selectedDeviceId, sendCommand])

  const handleStop = useCallback((autoStopped = false) => {
    isRecordingRef.current = false
    setIsRecording(false)
    if (selectedDeviceId) sendCommand({ deviceId: selectedDeviceId, action: 'stop_stream' })

    const snapshot = [...recordBuffer.current]
    recordBuffer.current = []

    if (snapshot.length === 0) return

    if (autoStopped) {
      toast.warning('Đã đạt giới hạn 5 phút, tự động dừng ghi.')
    }

    saveRecording({
      deviceId: selectedDeviceId!,
      label,
      startTimestamp: startTimeRef.current,
      endTimestamp: Date.now(),
      sampleCount: snapshot.length,
      samples: snapshot,
    })

    const csv = exportToCSV(snapshot, label)
    downloadCSV(csv, `${label}_${Date.now()}.csv`)
    toast.success(`Đã lưu ${snapshot.length.toLocaleString()} samples → CSV`)
  }, [selectedDeviceId, label, saveRecording, sendCommand])

  const connectionStatus = !selectedDeviceId
    ? 'offline'
    : isConnected
    ? 'online'
    : 'connecting'

  return (
    <div className="space-y-4">
      {/* Zone 1: Header — Quản lý kết nối */}
      <div className="flex items-center gap-4 flex-wrap">
        <DeviceSelector
          devices={devices}
          selectedId={selectedDeviceId}
          onSelect={setSelectedDeviceId}
          disabled={isRecording}
        />
        <StatusBadge status={connectionStatus} />
      </div>

      {/* Zone 2: Control Panel — Điều khiển thu thập */}
      <ControlPanel
        isRecording={isRecording}
        sampleCount={sampleCount}
        label={label}
        onLabelChange={setLabel}
        onStart={handleStart}
        onStop={() => handleStop(false)}
        disabled={!selectedDeviceId || !isConnected}
        pending={commandPending}
      />

      {/* Zone 3: Biểu đồ Realtime */}
      <div className="grid gap-4">
        <AccelChart data={accelData} />
        <GyroChart data={gyroData} />
      </div>
    </div>
  )
}
