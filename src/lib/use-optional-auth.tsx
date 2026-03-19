'use client'

// ClerkProvider 现在始终在 layout.tsx 中挂载，
// useOptionalAuth 可以直接使用 useAuth()，无需 Context bridge。

import { useAuth } from '@clerk/nextjs'

/**
 * 获取认证状态的 hook（现在直接委托给 Clerk useAuth）。
 * ClerkProvider 在 layout.tsx 中始终挂载，所以此处可以安全调用。
 */
export function useOptionalAuth(): { isSignedIn: boolean } {
  const { isSignedIn } = useAuth()
  return { isSignedIn: isSignedIn ?? false }
}

// 保留 ClerkAuthBridge 导出以避免破坏现有 import（不再实际使用）
export function ClerkAuthBridge({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
