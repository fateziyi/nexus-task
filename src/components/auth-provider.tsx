'use client'

import React from 'react'
import { ClerkProvider } from '@clerk/nextjs'
import { ClerkAuthBridge } from '@/lib/use-optional-auth'

// codeflicker-fix: AUTH-Issue-005/agek6tph1o7sjkmd3vvy
// codeflicker-fix: LOGIC-Issue-006/agek6tph1o7sjkmd3vvy
// 使用显式开关 NEXT_PUBLIC_AUTH_ENABLED 控制 Clerk 是否启用
// 同时通过 ClerkAuthBridge 将认证状态注入 Context，使下游组件无需直接调用 useAuth()
const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!isAuthEnabled) {
    // 认证未启用：直接渲染，Context 默认值为 {isSignedIn: false}
    return <>{children}</>
  }

  return (
    <ClerkProvider>
      {/* ClerkAuthBridge 在 ClerkProvider 内安全调用 useAuth()，并通过 Context 向下传递 */}
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </ClerkProvider>
  )
}
