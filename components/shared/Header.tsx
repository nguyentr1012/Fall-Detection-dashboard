'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/data-collection', label: 'Thu thập dữ liệu' },
]

export function Header() {
  const path = usePathname()
  return (
    <header className="border-b bg-card px-6 py-3 flex items-center gap-6 sticky top-0 z-50">
      <span className="font-semibold text-sm flex items-center gap-2">
        <span className="text-base"> Fall Detection System</span>
      </span>
      <nav className="flex gap-6">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'text-sm transition-colors',
              path === l.href
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
