'use client'

// codeflicker-fix: LOGIC-Issue-006/agek6tph1o7sjkmd3vvy
// 通过 React Context 提供认证状态，使 TaskBoard/TaskComments 等组件
// 无论是否在 ClerkProvider 内都能安全获取认证状态

import React, { createContext, useContext } from 'react'

interface AuthContextValue {
  isSignedIn: boolean
}

const AuthContext = createContext<AuthContextValue>({ isSignedIn: false })

/**
 * 当 Clerk 启用时，此组件从 ClerkProvider 读取认证状态并注入 Context。
 * 需在 AuthProvider（ClerkProvider 内部）中使用。
 */
export function ClerkAuthBridge({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useAuth } = require('@clerk/nextjs') as {
    useAuth: () => { isSignedIn: boolean | undefined }
  }
  const { isSignedIn } = useAuth()

  return (
    <AuthContext.Provider value={{ isSignedIn: isSignedIn ?? false }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * 安全获取认证状态的 hook。
 * - 若 NEXT_PUBLIC_AUTH_ENABLED=true 且组件树中有 ClerkAuthBridge：返回真实认证状态
 * - 否则：返回 { isSignedIn: false }（降级模式，不依赖 ClerkProvider）
 */
export function useOptionalAuth(): AuthContextValue {
  return useContext(AuthContext)
}
