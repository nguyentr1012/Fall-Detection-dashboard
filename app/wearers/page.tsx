'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WearersTable } from '@/components/features/wearers/WearersTable'
import { WearerFormDialog } from '@/components/features/wearers/WearerFormDialog'
import { useWearers, useDevices } from '@/hooks/useDeviceData'
import type { BackendWearer } from '@/services/api'

export default function WearersPage() {
  const { data: wearers = [], isLoading } = useWearers()
  const { data: devices = [] } = useDevices()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editWearer, setEditWearer] = useState<BackendWearer | null>(null)

  const handleEdit = (wearer: BackendWearer) => {
    setEditWearer(wearer)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditWearer(null)
    setDialogOpen(true)
  }

  const handleClose = () => {
    setDialogOpen(false)
    setEditWearer(null)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý bệnh nhân</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {wearers.length} bệnh nhân đang theo dõi
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Thêm bệnh nhân
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Danh sách bệnh nhân</CardTitle>
        </CardHeader>
        <CardContent>
          <WearersTable
            wearers={wearers}
            devices={devices}
            isLoading={isLoading}
            onEdit={handleEdit}
          />
        </CardContent>
      </Card>

      <WearerFormDialog
        open={dialogOpen}
        onClose={handleClose}
        mode={editWearer ? 'edit' : 'create'}
        wearer={editWearer}
      />
    </div>
  )
}
