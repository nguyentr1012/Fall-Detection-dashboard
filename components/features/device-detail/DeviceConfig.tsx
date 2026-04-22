'use client'
import { useState, useEffect } from 'react'
import { useDeviceConfig, useUpdateDeviceConfig } from '@/hooks/useDeviceData'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DeviceConfig({ deviceId }: { deviceId: string }) {
  const { data: config, isLoading } = useDeviceConfig(deviceId)
  const { mutate: update, isPending } = useUpdateDeviceConfig()

  const [name, setName] = useState('')
  const [rate, setRate] = useState<'50' | '100' | '200'>('100')
  const [threshold, setThreshold] = useState('')

  useEffect(() => {
    if (config) {
      setName(config.name)
      setRate(String(config.samplingRate) as '50' | '100' | '200')
      setThreshold(String(config.fallThreshold))
    }
  }, [config])

  if (isLoading) return <Skeleton className="h-60 rounded-xl" />
  if (!config) return null

  const handleSave = () => {
    update({
      deviceId,
      config: {
        name: name || config.name,
        samplingRate: Number(rate) as 50 | 100 | 200,
        fallThreshold: parseFloat(threshold) || config.fallThreshold,
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Cấu hình thiết bị</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Tên thiết bị</label>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Tần số lấy mẫu</label>
          <Select value={rate} onValueChange={v => setRate(v as typeof rate)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50 Hz</SelectItem>
              <SelectItem value="100">100 Hz</SelectItem>
              <SelectItem value="200">200 Hz</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Ngưỡng té ngã (SVM)</label>
          <input
            type="number"
            step="0.1"
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={threshold}
            onChange={e => setThreshold(e.target.value)}
          />
        </div>

        <Button size="sm" onClick={handleSave} disabled={isPending} className="w-full">
          {isPending ? 'Đang lưu…' : 'Lưu cấu hình'}
        </Button>
      </CardContent>
    </Card>
  )
}
