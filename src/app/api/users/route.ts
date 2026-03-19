// src/app/api/users/route.ts
// 用户相关 API 路由

import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getOrCreateUser } from '@/lib/get-or-create-user'
import { db } from '@/db'
import { users, memberships } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * GET /api/users
 * 获取当前登录用户的 DB 信息（如不存在则自动创建）
 */
export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
    const name = clerkUser.fullName ?? clerkUser.username ?? undefined
    const avatarUrl = clerkUser.imageUrl ?? undefined

    const user = await getOrCreateUser(userId, email, name, avatarUrl)

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Failed to get or create user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// codeflicker-fix: API-Issue-009/agek6tph1o7sjkmd3vvy
// 修复：将语义改为 "获取某组织下的成员列表"，与注释保持一致。
// 同时校验调用者是否在该组织内（防止越权查询成员）。
/**
 * POST /api/users
 * 获取某组织下的成员列表（用于任务指派时的用户选择）
 *
 * Body: { orgId: string }
 * 返回该组织下所有成员（含用户信息）
 * 要求调用者本身也是该组织成员
 */
export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
    const dbUser = await getOrCreateUser(userId, email)

    const body = await req.json()
    const { orgId } = body as { orgId?: string }

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    // 校验调用者是否为该组织成员
    const callerMembership = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, dbUser.id), eq(memberships.organizationId, orgId)))
      .limit(1)

    if (callerMembership.length === 0) {
      return NextResponse.json({ error: 'Forbidden: not a member of this organization' }, { status: 403 })
    }

    // 获取该组织下所有成员（含用户信息）
    const members = await db.query.memberships.findMany({
      where: eq(memberships.organizationId, orgId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json({
      members: members.map((m) => ({
        ...m.user,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    })
  } catch (error) {
    console.error('Failed to get org members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
