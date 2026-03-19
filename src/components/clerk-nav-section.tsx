'use client'

// clerk-nav-section.tsx — 客户端组件
// 由于 Navbar 是客户端组件（避免 Radix UI hydration mismatch），
// 此组件也须为客户端组件，使用 useAuth() 替代 <Show>（<Show> 是 async Server Component）
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, SignInButton, SignUpButton, useAuth } from '@clerk/nextjs'
import { LayoutDashboard, FolderKanban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { href: '/projects', label: '项目', icon: FolderKanban },
]

export function ClerkNavSection() {
  const { isSignedIn } = useAuth()
  const pathname = usePathname()

  if (isSignedIn) {
    return (
      <>
        {/* 已登录：导航链接 */}
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
        {/* 用户头像 */}
        <div className="flex items-center ml-2">
          <UserButton />
        </div>
      </>
    )
  }

  return (
    <div className="flex items-center gap-2 ml-auto">
      <SignInButton mode="modal">
        <Button variant="ghost" size="sm">登录</Button>
      </SignInButton>
      <SignUpButton mode="modal">
        <Button size="sm">注册</Button>
      </SignUpButton>
    </div>
  )
}
