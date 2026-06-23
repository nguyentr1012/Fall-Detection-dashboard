'use client'

import { useState, useRef } from 'react'
import { Bell, Upload, Cpu } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useCurrentUser, useUploadFirmware } from '@/hooks/useDeviceData'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { soundEnabled, setSoundEnabled } = useSettingsStore()

  // Firmware upload (ADMIN only)
  const { data: currentUser } = useCurrentUser()
  const uploadFirmware = useUploadFirmware()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadForm, setUploadForm] = useState({
    version: '',
    release_date: new Date().toISOString().split('T')[0],
    changelog: '',
    is_stable: true,
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.version || !uploadForm.changelog) return
    try {
      const result = await uploadFirmware.mutateAsync({
        file: selectedFile,
        ...uploadForm,
      })
      toast.success(`Firmware ${result.version} đã upload thành công`)
      setSelectedFile(null)
      setUploadForm({ version: '', release_date: new Date().toISOString().split('T')[0], changelog: '', is_stable: true })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload thất bại')
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cài đặt hệ thống</h1>
        <p className="text-muted-foreground text-sm mt-1">Cấu hình thông báo và quản lý firmware</p>
      </div>

      {/* Firmware Upload — ADMIN only */}
      {currentUser?.role === 'ADMIN' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Upload Firmware (ADMIN)</CardTitle>
            </div>
            <CardDescription>
              Upload file .bin để thêm phiên bản firmware OTA mới vào hệ thống.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="fwFile">File firmware (.bin)</Label>
              <Input
                id="fwFile"
                ref={fileInputRef}
                type="file"
                accept=".bin"
                onChange={handleFileChange}
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="fwVersion">Version (vd: 1.4.0)</Label>
                <Input
                  id="fwVersion"
                  value={uploadForm.version}
                  onChange={(e) => setUploadForm((f) => ({ ...f, version: e.target.value }))}
                  placeholder="1.4.0"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fwDate">Ngày phát hành</Label>
                <Input
                  id="fwDate"
                  type="date"
                  value={uploadForm.release_date}
                  onChange={(e) => setUploadForm((f) => ({ ...f, release_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="fwChangelog">Changelog</Label>
              <textarea
                id="fwChangelog"
                rows={3}
                value={uploadForm.changelog}
                onChange={(e) => setUploadForm((f) => ({ ...f, changelog: e.target.value }))}
                placeholder={"- Fix lỗi OTA timeout\n- Cập nhật ngưỡng phát hiện ngã"}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="fwStable"
                checked={uploadForm.is_stable}
                onCheckedChange={(v) => setUploadForm((f) => ({ ...f, is_stable: v }))}
              />
              <Label htmlFor="fwStable" className="cursor-pointer">
                Đánh dấu là Stable (hiển thị cho tất cả thiết bị)
              </Label>
            </div>

            <Button
              onClick={handleUpload}
              disabled={
                !selectedFile ||
                !uploadForm.version ||
                !uploadForm.changelog ||
                uploadFirmware.isPending
              }
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              {uploadFirmware.isPending ? 'Đang upload...' : 'Upload firmware'}
            </Button>
          </CardContent>
        </Card>
      )}

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
