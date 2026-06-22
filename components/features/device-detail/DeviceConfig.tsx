'use client'
import { useState, useEffect } from 'react'
import { useDevice, useUpdateDevice } from '@/hooks/useDeviceData'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Cpu, Wifi, Activity, Battery, Clock, Power, ShieldAlert, Gauge } from 'lucide-react'
import { toast } from 'sonner'

export function DeviceConfig({ deviceId }: { deviceId: string }) {
  const { data: device, isLoading: deviceLoading } = useDevice(deviceId)
  const { mutate: updateDevice, isPending: updatingDevice } = useUpdateDevice()

  const [interval, setInterval] = useState('5')
  const [isActive, setIsActive] = useState(true)
  const [fallThreshold, setFallThreshold] = useState(0.6)
  const [fallCooldown, setFallCooldown] = useState('15')

  useEffect(() => {
    if (device) {
      if (device.is_active !== undefined) setIsActive(device.is_active)
      if (device.telemetry_interval) setInterval(device.telemetry_interval.toString())
      if (device.fall_threshold !== undefined) setFallThreshold(device.fall_threshold)
      if (device.fall_cooldown !== undefined) setFallCooldown(device.fall_cooldown.toString())
    }
  }, [device])

  const handleSaveInterval = () => {
    updateDevice({ id: deviceId, payload: { telemetry_interval: parseInt(interval, 10) } }, {
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

  const handleToggleActive = (checked: boolean) => {
    setIsActive(checked)
    updateDevice({ id: deviceId, payload: { is_active: checked } }, {
      onSuccess: () => {
        toast.success(checked ? 'Đã bật theo dõi thiết bị' : 'Đã tạm ngưng theo dõi thiết bị')
      }
    })
  }

  if (deviceLoading) return <Skeleton className="h-60 w-full rounded-xl" />
  if (!device) return null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-500" />
            Thông tin phần cứng
          </CardTitle>
          <CardDescription>Chi tiết phần cứng thiết bị & trạng thái hiện tại</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <Select value={interval} onValueChange={setInterval}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn chu kỳ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 giây (Realtime - Tốn pin)</SelectItem>
                  <SelectItem value="5">5 giây (Khuyên dùng)</SelectItem>
                  <SelectItem value="10">10 giây (Tiết kiệm pin)</SelectItem>
                  <SelectItem value="30">30 giây</SelectItem>
                  <SelectItem value="60">1 phút</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveInterval} disabled={updatingDevice} className="w-full md:w-auto">Lưu chu kỳ</Button>
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
          <Button onClick={handleSaveFallThreshold} disabled={updatingDevice} className="w-full md:w-auto">
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
            <Button onClick={handleSaveFallCooldown} disabled={updatingDevice} className="w-full md:w-auto">
              Lưu thời gian
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-orange-500" />
            Trạng thái theo dõi
          </CardTitle>
          <CardDescription>Tạm ngưng giám sát khi bệnh nhân không đeo thiết bị</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50/50">
            <div>
              <p className="font-medium text-sm text-gray-900">Cho phép theo dõi (Active Tracking)</p>
              <p className="text-xs text-gray-500 mt-1">Khi tắt, thiết bị sẽ không gửi cảnh báo té ngã hoặc dữ liệu nhịp tim.</p>
            </div>
            <Switch 
              checked={isActive} 
              onCheckedChange={handleToggleActive} 
              disabled={updatingDevice} 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
