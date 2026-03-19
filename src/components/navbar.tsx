'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ModeToggle } from '@/components/mode-toggle'
import { ClerkNavSection } from '@/components/clerk-nav-section'
import { Zap } from 'lucide-react'

// 检查 Clerk 是否已配置（客户端可读的公开 key）
// codeflicker-fix: AUTH-Issue-005/agek6tph1o7sjkmd3vvy
function getIsClerkConfigured(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true'
}

export function Navbar() {
  const isClerkConfigured = getIsClerkConfigured()

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

        {/*
          ClerkNavSection 内部调用了 useAuth()，
          只有 ClerkProvider 已包裹时才可安全渲染。
          isClerkConfigured 在服务端/客户端均为 false 时跳过渲染，
          避免在 ClerkProvider 之外调用 Clerk hooks 报错。
        */}
        {isClerkConfigured && <ClerkNavSection />}

        {/* 右侧主题切换（始终显示） */}
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
