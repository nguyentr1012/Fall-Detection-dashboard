'use client'

import { useState } from 'react'
import { Wifi, Bell, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useSettingsStore } from '@/store/useSettingsStore'
import { getMqttClient } from '@/lib/mqtt-client'

export default function SettingsPage() {
  const {
    mqttBrokerUrl,
    mqttUsername,
    mqttPassword,
    soundEnabled,
    setMqttBrokerUrl,
    setMqttUsername,
    setMqttPassword,
    setSoundEnabled,
  } = useSettingsStore()

  const [showPassword, setShowPassword] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [reconnectStatus, setReconnectStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  const handleReconnect = async () => {
    setIsReconnecting(true)
    setReconnectStatus('idle')
    try {
      const client = getMqttClient()
      await client.reconfigure(mqttBrokerUrl, mqttUsername, mqttPassword)
      setReconnectStatus('ok')
    } catch {
      setReconnectStatus('error')
    } finally {
      setIsReconnecting(false)
      setTimeout(() => setReconnectStatus('idle'), 3000)
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cài đặt hệ thống</h1>
        <p className="text-muted-foreground text-sm mt-1">Cấu hình kết nối và thông báo</p>
      </div>

      {/* MQTT Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Cấu hình MQTT Broker</CardTitle>
          </div>
          <CardDescription>
            Địa chỉ broker và thông tin xác thực. Thay đổi sẽ được lưu ngay lập tức.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="brokerUrl">Địa chỉ Broker (WSS URL)</Label>
            <Input
              id="brokerUrl"
              value={mqttBrokerUrl}
              onChange={(e) => setMqttBrokerUrl(e.target.value)}
              placeholder="wss://mqtt.example.com:8883"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="mqttUser">Username</Label>
              <Input
                id="mqttUser"
                value={mqttUsername}
                onChange={(e) => setMqttUsername(e.target.value)}
                placeholder="username"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mqttPass">Password</Label>
              <div className="relative">
                <Input
                  id="mqttPass"
                  type={showPassword ? 'text' : 'password'}
                  value={mqttPassword}
                  onChange={(e) => setMqttPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={handleReconnect}
              disabled={isReconnecting || !mqttBrokerUrl}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
              {isReconnecting ? 'Đang kết nối...' : 'Áp dụng & Kết nối lại'}
            </Button>
            {reconnectStatus === 'ok' && (
              <Badge variant="outline" className="text-emerald-600 border-emerald-300">Kết nối thành công</Badge>
            )}
            {reconnectStatus === 'error' && (
              <Badge variant="outline" className="text-red-500 border-red-300">Kết nối thất bại</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Cài đặt thông báo</CardTitle>
          </div>
          <CardDescription>Điều chỉnh âm thanh và cách hiển thị cảnh báo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Âm thanh cảnh báo</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Phát tiếng báo động khi phát hiện té ngã
              </p>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
