'use client'
import { useState, useEffect } from 'react'
import { useDevice, useUpdateDevice, useDeviceConfig, useUpdateDeviceConfig } from '@/hooks/useDeviceData'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Cpu, Wifi, Activity, Battery, Clock, Power, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

export function DeviceConfig({ deviceId }: { deviceId: string }) {
  const { data: device, isLoading: deviceLoading } = useDevice(deviceId)
  const { mutate: updateDevice, isPending: updatingDevice } = useUpdateDevice()
  
  const { data: config, isLoading: configLoading } = useDeviceConfig(deviceId)
  const { mutate: updateConfig, isPending: updatingConfig } = useUpdateDeviceConfig()

  const [interval, setInterval] = useState('5')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (device) {
      if (device.is_active !== undefined) setIsActive(device.is_active)
      if (device.telemetry_interval) setInterval(device.telemetry_interval.toString())
    }
  }, [device])

  const handleSaveInterval = () => {
    updateDevice({ id: deviceId, payload: { telemetry_interval: parseInt(interval, 10) } }, {
      onSuccess: () => {
        toast.success('Đã gửi cấu hình chu kỳ gửi dữ liệu xuống thiết bị!')
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

  if (deviceLoading || configLoading) return <Skeleton className="h-60 w-full rounded-xl" />
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
