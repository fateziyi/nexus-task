// src/app/api/pusher/auth/route.ts
// codeflicker-fix: SEC-Issue-004/agek6tph1o7sjkmd3vvy
// 修复：在授权频道前，基于 channelName 解析 projectId 并校验当前用户是否为该项目组织成员
import { pusherServer } from '@/lib/pusher'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getOrCreateUser } from '@/lib/get-or-create-user'
import { validateProjectMembership } from '@/app/actions/project-action'

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? ''
  const name = clerkUser?.fullName ?? clerkUser?.username ?? 'Anonymous'
  const avatarUrl = clerkUser?.imageUrl ?? undefined

  // 同步用户到 DB
  const dbUser = await getOrCreateUser(userId, email, name, avatarUrl)

  const body = await req.text()
  const params = new URLSearchParams(body)
  const socketId = params.get('socket_id') ?? ''
  const channelName = params.get('channel_name') ?? ''

  // 解析频道名中的 projectId
  // 支持格式：presence-project-{projectId} 和 private-project-{projectId}
  const presenceMatch = channelName.match(/^presence-project-(.+)$/)
  const privateMatch = channelName.match(/^private-project-(.+)$/)
  const projectId = presenceMatch?.[1] ?? privateMatch?.[1]

  // 如果是 project 相关频道，校验用户是否为该项目组织成员
  if (projectId) {
    const isMember = await validateProjectMembership(dbUser.id, projectId)
    if (!isMember) {
      return new Response('Forbidden: not a member of this project organization', { status: 403 })
    }
  }

  // 对于 presence 频道，提供用户信息
  const presenceData = {
    user_id: dbUser.id,
    user_info: {
      name: dbUser.name ?? name,
      avatar: dbUser.avatarUrl ?? avatarUrl ?? null,
    },
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData)

  return new Response(JSON.stringify(authResponse), {
    headers: { 'Content-Type': 'application/json' },
  })
}
