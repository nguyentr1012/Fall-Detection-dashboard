import { Badge } from '@/components/ui/badge'

type Status = 'online' | 'offline' | 'connecting'

const STATUS_MAP: Record<Status, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  online:     { label: '🟢 Connected',   variant: 'default' },
  connecting: { label: '🟡 Connecting…', variant: 'secondary' },
  offline:    { label: '🔴 Disconnected', variant: 'destructive' },
}

export function StatusBadge({ status }: { status: Status }) {
  const { label, variant } = STATUS_MAP[status]
  return <Badge variant={variant}>{label}</Badge>
}
