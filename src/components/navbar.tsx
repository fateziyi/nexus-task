'use client'

// navbar.tsx — 客户端组件
// 保持为客户端组件：Navbar 包含 ModeToggle（Radix DropdownMenu）等交互组件，
// 在 Server Component 中渲染 Radix UI 会导致 SSR/客户端 ID 不一致（hydration mismatch）
import Link from 'next/link'
import { ModeToggle } from '@/components/mode-toggle'
import { ClerkNavSection } from '@/components/clerk-nav-section'
import { Zap } from 'lucide-react'

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center max-w-7xl mx-auto px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </div>
          <span className="font-bold text-lg">Nexus Task</span>
        </Link>

        {/* Clerk 认证区域 */}
        <ClerkNavSection />

        {/* 右侧主题切换 */}
        <div className="ml-auto flex items-center gap-2 pl-3">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
