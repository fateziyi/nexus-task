// codeflicker-fix: AUTH-Issue-005/agek6tph1o7sjkmd3vvy
// 修复：改用显式环境变量 NEXT_PUBLIC_AUTH_ENABLED 控制 Clerk 是否启用，
// 避免通过 key 前缀/占位符猜测带来的环境差异行为
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 定义需要保护的路由（需要登录才能访问）
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/projects(.*)',
])

// 使用显式开关判断 Clerk 是否启用
// 在 .env.local 中设置 NEXT_PUBLIC_AUTH_ENABLED=true 来启用认证
const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true'

// 如果认证未启用，使用简单的 passthrough middleware
export default isAuthEnabled
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect()
      }
    })
  : function middleware(_req: NextRequest) {
      return NextResponse.next()
    }

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
