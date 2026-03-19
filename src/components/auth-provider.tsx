'use client'

// AuthProvider 已废弃，ClerkProvider 现在直接在 src/app/layout.tsx 中使用。
// 保留此文件仅为避免破坏可能的外部引用（实际不再被 layout 使用）。
import React from 'react'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
