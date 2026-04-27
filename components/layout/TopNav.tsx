'use client'
import { Menu, Search, Bell, Settings } from 'lucide-react'

interface Props {
  onMenuToggle: () => void
}

export function TopNav({ onMenuToggle }: Props) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-3 px-4 shrink-0">
      {/* Hamburger */}
      <button
        onClick={onMenuToggle}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="size-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <input
          type="search"
          placeholder="Search patients or devices..."
          className="w-full h-8 pl-9 pr-3 text-sm bg-gray-50 border border-gray-200 rounded-lg
                     placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white transition-colors"
        />
      </div>

      <div className="flex-1" />

      {/* System status */}
      <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        System: Operational
      </div>

      {/* Icons */}
      <button className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors relative">
        <Bell className="size-5" />
      </button>
      <button className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
        <Settings className="size-5" />
      </button>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-xs font-bold cursor-pointer">
        NS
      </div>
    </header>
  )
}
