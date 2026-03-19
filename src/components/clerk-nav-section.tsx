'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, useAuth } from '@clerk/nextjs'
import { LayoutDashboard, FolderKanban } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { href: '/projects', label: '项目', icon: FolderKanban },
]

/**
 * 仅在 ClerkProvider 内部使用的导航部分（含 useAuth）
 * 必须由 AuthProvider 有条件地渲染，确保 ClerkProvider 已存在
 */
export function ClerkNavSection() {
  const { isSignedIn } = useAuth()
  const pathname = usePathname()

  return (
    <>
      {isSignedIn && (
        <nav className="flex items-center gap-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      )}
      {isSignedIn && (
        <div className="flex items-center">
          <UserButton />
        </div>
      )}
    </>
  )
}
