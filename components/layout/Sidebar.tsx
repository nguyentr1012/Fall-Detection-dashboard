'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Radio,
  Activity,
  Bell,
  Settings,
  Diamond,
  LogOut,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Wearers', href: '/wearers', icon: Users },
  { label: 'Devices', href: '/devices', icon: Radio },
  { label: 'Data Collector', href: '/data-collection', icon: Activity },
  { label: 'Alert History', href: '/alerts', icon: Bell },
  { label: 'System Settings', href: '/settings', icon: Settings },
]

interface Props {
  isOpen: boolean
}

export function Sidebar({ isOpen }: Props) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-200 shrink-0',
        isOpen ? 'w-52' : 'w-0 overflow-hidden'
      )}
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold">VG</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight truncate">VitalsGuard AI</p>
            <p className="text-[9px] text-gray-400 uppercase tracking-widest leading-tight">Clinical Monitoring</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-3 space-y-2">
        <button
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
          onClick={() => alert('Emergency protocol activated!')}
        >
          <Diamond className="size-3.5 fill-white" />
          EMERGENCY
        </button>

        <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
              AD
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xs font-medium text-gray-700 truncate">Admin</p>
              <p className="text-[10px] text-gray-400 uppercase">System Admin</p>
            </div>
          </div>
          <button
            onClick={async () => {
              const { logout } = await import('@/app/actions/auth')
              await logout()
              window.location.href = '/login'
            }}
            className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-md transition-colors"
            title="Đăng xuất"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
