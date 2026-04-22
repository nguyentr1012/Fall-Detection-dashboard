import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import type { Alert } from '@/src/types'

const SEVERITY_VARIANT: Record<Alert['severity'], 'default' | 'secondary' | 'destructive'> = {
  critical: 'destructive',
  warning: 'secondary',
  info: 'outline' as 'default',
}

const SEVERITY_LABEL: Record<Alert['severity'], string> = {
  critical: 'Nghiêm trọng',
  warning: 'Cảnh báo',
  info: 'Thông tin',
}

interface Props {
  alerts: Alert[]
  isLoading: boolean
}

export function AlertTable({ alerts, isLoading }: Props) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-xl" />
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm border rounded-xl">
        Chưa có cảnh báo nào
      </div>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">Mức độ</TableHead>
            <TableHead>Thiết bị</TableHead>
            <TableHead>Nội dung</TableHead>
            <TableHead className="w-44 text-right">Thời gian</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map(a => (
            <TableRow key={a.id}>
              <TableCell>
                <Badge variant={SEVERITY_VARIANT[a.severity]}>
                  {SEVERITY_LABEL[a.severity]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm font-medium">{a.deviceName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{a.message}</TableCell>
              <TableCell className="text-xs text-muted-foreground text-right">
                {new Date(a.timestamp).toLocaleString('vi-VN')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
