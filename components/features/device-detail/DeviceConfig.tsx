'use client'
import { useState, useEffect } from 'react'
import { useDevice, useUpdateDevice, useFirmwareVersions, useTriggerFirmwareUpdate } from '@/hooks/useDeviceData'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Cpu, Wifi, Activity, Battery, Clock, Power, Gauge, Download, AlertTriangle, Signal } from 'lucide-react'
import { toast } from 'sonner'

export function DeviceConfig({ deviceId }: { deviceId: string }) {
  const { data: device, isLoading: deviceLoading } = useDevice(deviceId)
  const { mutate: updateDevice, isPending: updatingDevice } = useUpdateDevice()
  const { data: firmwareVersions = [], isLoading: firmwareLoading } = useFirmwareVersions()
  const { mutate: triggerOta, isPending: otaPending } = useTriggerFirmwareUpdate()

  const [telemetryInterval, setTelemetryInterval] = useState('30')
  const [fallThreshold, setFallThreshold] = useState(0.25)
  const [fallCooldown, setFallCooldown] = useState('15')
  const [fallConfirmWindow, setFallConfirmWindow] = useState('4')
  const [streamTimeout, setStreamTimeout] = useState('5')
  const [rssiInterval, setRssiInterval] = useState('0')
  const [selectedFirmwareVersion, setSelectedFirmwareVersion] = useState('')

  useEffect(() => {
    if (device) {
      if (device.telemetry_interval) setTelemetryInterval(device.telemetry_interval.toString())
      if (device.fall_threshold !== undefined) setFallThreshold(device.fall_threshold)
      if (device.fall_cooldown !== undefined) setFallCooldown(device.fall_cooldown.toString())
      if (device.fall_confirm_window !== undefined) setFallConfirmWindow(device.fall_confirm_window.toString())
      if (device.stream_timeout !== undefined) setStreamTimeout(device.stream_timeout.toString())
      if (device.rssi_interval !== undefined) setRssiInterval(device.rssi_interval.toString())
    }
  }, [device])

  const handleSaveInterval = () => {
    updateDevice({ id: deviceId, payload: { telemetry_interval: parseInt(telemetryInterval, 10) } }, {
      onSuccess: () => {
        toast.success('Đã gửi cấu hình chu kỳ gửi dữ liệu xuống thiết bị!')
      }
    })
  }

  const handleSaveFallThreshold = () => {
    updateDevice({ id: deviceId, payload: { fall_threshold: fallThreshold } }, {
      onSuccess: () => {
        toast.success(`Đã gửi ngưỡng phát hiện ngã (${Math.round(fallThreshold * 100)}%) xuống thiết bị!`)
      }
    })
  }

  const handleSaveFallCooldown = () => {
    updateDevice({ id: deviceId, payload: { fall_cooldown: parseInt(fallCooldown, 10) } }, {
      onSuccess: () => {
        toast.success(`Đã gửi thời gian hồi cảnh báo ngã (${fallCooldown}s) xuống thiết bị!`)
      }
    })
  }

  const handleSaveFallConfirmWindow = () => {
    updateDevice({ id: deviceId, payload: { fall_confirm_window: parseInt(fallConfirmWindow, 10) } }, {
      onSuccess: () => {
        toast.success(`Đã gửi cửa sổ xác nhận ngã (${fallConfirmWindow}s) xuống thiết bị!`)
      }
    })
  }

  const handleSaveStreamTimeout = () => {
    updateDevice({ id: deviceId, payload: { stream_timeout: parseInt(streamTimeout, 10) } }, {
      onSuccess: () => {
        toast.success(`Đã gửi giới hạn thời gian stream (${streamTimeout} phút) xuống thiết bị!`)
      }
    })
  }

  const handleSaveRssiInterval = () => {
    const val = parseInt(rssiInterval, 10)
    updateDevice({ id: deviceId, payload: { rssi_interval: val } }, {
      onSuccess: () => {
        toast.success(val === 0
          ? 'Đã tắt đo sóng 4G RSSI trên thiết bị!'
          : `Đã gửi chu kỳ đo sóng 4G (${val}s) xuống thiết bị!`)
      }
    })
  }

  const selectedFirmware = firmwareVersions.find(f => f.version === selectedFirmwareVersion)

  const handleFirmwareUpdate = () => {
    if (!selectedFirmware) return
    triggerOta(
      { deviceId, version: selectedFirmware.version, downloadUrl: selectedFirmware.download_url },
      {
        onSuccess: () => {
          toast.success(`Đã gửi lệnh OTA v${selectedFirmware.version} — thiết bị sẽ tự khởi động lại sau khi tải xong.`)
          setSelectedFirmwareVersion('')
        },
        onError: () => toast.error('Gửi lệnh OTA thất bại. Kiểm tra kết nối MQTT broker.'),
      }
    )
  }

  if (deviceLoading) return <Skeleton className="h-60 w-full rounded-xl" />
  if (!device) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-500" />
            Thông tin phần cứng
          </CardTitle>
          <CardDescription>Chi tiết phần cứng thiết bị & trạng thái hiện tại</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Wifi className="w-3 h-3"/> Device ID (MAC)</p>
              <p className="text-sm font-mono font-medium">{device.id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3"/> Firmware</p>
              <p className="text-sm font-medium">v{device.firmwareVersion}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Battery className="w-3 h-3"/> Pin hiện tại</p>
              <p className="text-sm font-medium">{device.batteryLevel ? `${device.batteryLevel}%` : 'Đang cập nhật...'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Power className="w-3 h-3"/> Trạng thái mạng</p>
              <Badge variant={device.status === 'online' ? 'default' : 'secondary'} className={device.status === 'online' ? 'bg-emerald-500 text-[10px]' : 'text-[10px]'}>
                {device.status === 'online' ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-500" />
            Cấu hình hoạt động
          </CardTitle>
          <CardDescription>Quản lý chu kỳ gửi dữ liệu telemetry</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-xs font-medium text-gray-700">Chu kỳ gửi dữ liệu (Data Interval)</label>
              <Select value={telemetryInterval} onValueChange={setTelemetryInterval}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn chu kỳ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 giây</SelectItem>
                  <SelectItem value="5">5 giây</SelectItem>
                  <SelectItem value="15">15 giây</SelectItem>
                  <SelectItem value="30">30 giây (Mặc định)</SelectItem>
                  <SelectItem value="60">1 phút</SelectItem>
                  <SelectItem value="120">2 phút</SelectItem>
                  <SelectItem value="300">5 phút</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveInterval} disabled={updatingDevice} className="w-full md:w-auto shrink-0">Lưu chu kỳ</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4 text-purple-500" />
            Độ nhạy phát hiện ngã
          </CardTitle>
          <CardDescription>Ngưỡng xác suất AI để chốt &quot;ngã&quot;. Cao = ít báo nhầm nhưng dễ bỏ sót.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">Ngưỡng (fall_threshold)</label>
            <span className="text-sm font-semibold text-purple-600">{Math.round(fallThreshold * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.15}
            max={0.95}
            step={0.05}
            value={fallThreshold}
            onChange={e => setFallThreshold(parseFloat(e.target.value))}
            className="w-full accent-purple-600"
          />
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>15% — nhạy, nhiều báo nhầm</span>
            <span>95% — chắc chắn, dễ bỏ sót</span>
          </div>
          <Button onClick={handleSaveFallThreshold} disabled={updatingDevice} className="w-full md:w-auto shrink-0">
            Lưu ngưỡng
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            Thời gian hồi cảnh báo ngã
          </CardTitle>
          <CardDescription>Thời gian thiết bị im lặng sau khi báo ngã để tránh cảnh báo spam trùng lặp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-xs font-medium text-gray-700">Cooldown (giây)</label>
              <Select value={fallCooldown} onValueChange={setFallCooldown}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn thời gian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 giây</SelectItem>
                  <SelectItem value="15">15 giây (Mặc định)</SelectItem>
                  <SelectItem value="30">30 giây</SelectItem>
                  <SelectItem value="60">1 phút</SelectItem>
                  <SelectItem value="300">5 phút</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveFallCooldown} disabled={updatingDevice} className="w-full md:w-auto shrink-0">
              Lưu thời gian
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-500" />
            Cửa sổ xác nhận ngã
          </CardTitle>
          <CardDescription>Sau khi AI phát hiện ngã, thiết bị chờ N giây để xác nhận tư thế nằm im — loại bỏ báo giả mà không bỏ sót ngã thật.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-xs font-medium text-gray-700">Cửa sổ xác nhận (giây)</label>
              <Select value={fallConfirmWindow} onValueChange={setFallConfirmWindow}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn thời gian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 giây (Rất nhanh)</SelectItem>
                  <SelectItem value="2">2 giây</SelectItem>
                  <SelectItem value="3">3 giây</SelectItem>
                  <SelectItem value="4">4 giây (Mặc định)</SelectItem>
                  <SelectItem value="5">5 giây</SelectItem>
                  <SelectItem value="8">8 giây</SelectItem>
                  <SelectItem value="10">10 giây</SelectItem>
                  <SelectItem value="15">15 giây (Chắc chắn)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveFallConfirmWindow} disabled={updatingDevice} className="w-full md:w-auto shrink-0">
              Lưu thời gian
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-500" />
            Giới hạn thời gian Stream IMU
          </CardTitle>
          <CardDescription>Thời gian tự động ngắt luồng stream IMU liên tục để tiết kiệm pin và băng thông.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-xs font-medium text-gray-700">Tự động ngắt sau (phút)</label>
              <Select value={streamTimeout} onValueChange={setStreamTimeout}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn thời gian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 phút</SelectItem>
                  <SelectItem value="5">5 phút (Mặc định)</SelectItem>
                  <SelectItem value="10">10 phút</SelectItem>
                  <SelectItem value="15">15 phút</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveStreamTimeout} disabled={updatingDevice} className="w-full md:w-auto shrink-0">
              Lưu thời gian
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Signal className="w-4 h-4 text-sky-500" />
            Chu kỳ đo sóng 4G (RSSI)
          </CardTitle>
          <CardDescription>
            Mỗi lần đo RSSI 4G làm gián đoạn kết nối ~15-20s (thoát PPP → AT+CSQ → nối lại). Chọn <strong>Tắt</strong> khi triển khai thực tế để bảo vệ đường cảnh báo ngã.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-xs font-medium text-gray-700">Chu kỳ đo sóng</label>
              <Select value={rssiInterval} onValueChange={setRssiInterval}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn chu kỳ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Tắt (0) — Mặc định khi deploy</SelectItem>
                  <SelectItem value="60">60 giây</SelectItem>
                  <SelectItem value="120">120 giây</SelectItem>
                  <SelectItem value="300">300 giây</SelectItem>
                  <SelectItem value="600">600 giây</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveRssiInterval} disabled={updatingDevice} className="w-full md:w-auto shrink-0">
              Lưu chu kỳ
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-500" />
            Cập nhật Firmware (OTA)
          </CardTitle>
          <CardDescription>
            Chọn phiên bản để cập nhật qua mạng. Thiết bị sẽ tự khởi động lại sau khi flash xong.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Phiên bản hiện tại:</span>
            <Badge variant="outline" className="font-mono text-xs">v{device.firmwareVersion}</Badge>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Chọn phiên bản cập nhật</label>
            {firmwareLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select value={selectedFirmwareVersion} onValueChange={setSelectedFirmwareVersion}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="-- Chọn phiên bản --" />
                </SelectTrigger>
                <SelectContent>
                  {firmwareVersions.map(fw => (
                    <SelectItem key={fw.version} value={fw.version}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">v{fw.version}</span>
                        {fw.is_latest && <Badge className="text-[10px] px-1 py-0 h-4 bg-blue-500">Mới nhất</Badge>}
                        {!fw.is_stable && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">Beta</Badge>}
                        <span className="text-muted-foreground text-xs">{fw.release_date}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedFirmware && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 space-y-1">
              <p className="text-xs font-semibold text-blue-800">Thay đổi trong v{selectedFirmware.version}:</p>
              <p className="text-xs text-blue-700">{selectedFirmware.changelog}</p>
            </div>
          )}

          <div className="flex gap-2 items-start p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              Thiết bị sẽ tự động khởi động lại sau khi tải xong firmware (~1–3 phút). Đảm bảo pin &gt; 30% trước khi cập nhật.
            </p>
          </div>

          <Button
            onClick={handleFirmwareUpdate}
            disabled={
              !selectedFirmwareVersion ||
              selectedFirmwareVersion === device.firmwareVersion ||
              otaPending
            }
            className="w-full md:w-auto shrink-0"
          >
            <Download className="w-4 h-4 mr-2" />
            {otaPending ? 'Đang gửi lệnh OTA...' : 'Cập nhật firmware'}
          </Button>

          {selectedFirmwareVersion === device.firmwareVersion && (
            <p className="text-xs text-muted-foreground">Thiết bị đã chạy phiên bản này.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
