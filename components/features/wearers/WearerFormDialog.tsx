'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateWearer, useUpdateWearer } from '@/hooks/useDeviceData'
import type { BackendWearer } from '@/services/api'

interface Props {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  wearer?: BackendWearer | null
}

export function WearerFormDialog({ open, onClose, mode, wearer }: Props) {
  const [fullName, setFullName] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [errors, setErrors] = useState<{ fullName?: string; heightCm?: string }>({})

  const createWearer = useCreateWearer()
  const updateWearer = useUpdateWearer()
  const isPending = createWearer.isPending || updateWearer.isPending

  useEffect(() => {
    if (open) {
      setFullName(wearer?.full_name ?? '')
      setHeightCm(wearer?.height_cm ? String(wearer.height_cm) : '')
      setErrors({})
    }
  }, [open, wearer])

  const validate = () => {
    const e: { fullName?: string; heightCm?: string } = {}
    if (!fullName.trim() || fullName.trim().length < 2) e.fullName = 'Tên phải có ít nhất 2 ký tự'
    const h = Number(heightCm)
    if (!heightCm || isNaN(h) || h < 100 || h > 250) e.heightCm = 'Chiều cao phải từ 100–250 cm'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    try {
      if (mode === 'create') {
        await createWearer.mutateAsync({
          full_name: fullName.trim(),
          height_cm: Number(heightCm),
        })
      } else if (wearer) {
        await updateWearer.mutateAsync({
          id: wearer.id,
          payload: { full_name: fullName.trim(), height_cm: Number(heightCm) },
        })
      }
      onClose()
    } catch {
      setErrors({ fullName: 'Lỗi khi lưu. Vui lòng thử lại.' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Thêm bệnh nhân mới' : 'Chỉnh sửa bệnh nhân'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="fullName">Họ và tên <span className="text-red-500">*</span></Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              disabled={isPending}
            />
            {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="heightCm">Chiều cao (cm) <span className="text-red-500">*</span></Label>
            <Input
              id="heightCm"
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="165"
              min={100}
              max={250}
              disabled={isPending}
            />
            {errors.heightCm && <p className="text-xs text-red-500">{errors.heightCm}</p>}
            <p className="text-xs text-muted-foreground">Dùng để tính độ dài bước chân</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Đang lưu...' : mode === 'create' ? 'Thêm mới' : 'Cập nhật'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
