// src/app/actions/comment-action.ts
'use server'

import { pusherServer } from '@/lib/pusher'
import { db } from '@/db'
import { comments } from '@/db/schema'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getOrCreateUser } from '@/lib/get-or-create-user'
import { eq } from 'drizzle-orm'

interface AddCommentPayload {
  taskId: string
  content: string
  projectId: string // 用于频道名称
}

export async function addComment(payload: AddCommentPayload) {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const clerkUser = await currentUser()
  if (!clerkUser) {
    throw new Error('User not found')
  }

  // 获取或创建本地 DB 用户
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const name = clerkUser.fullName ?? clerkUser.username ?? undefined
  const avatarUrl = clerkUser.imageUrl ?? undefined
  const dbUser = await getOrCreateUser(userId, email, name, avatarUrl)

  const { taskId, content, projectId } = payload

  try {
    const [newComment] = await db
      .insert(comments)
      .values({
        content,
        taskId,
        createdById: dbUser.id,
      })
      .returning()

    const channelName = `private-project-${projectId}`
    await pusherServer.trigger(channelName, 'new-comment', {
      id: newComment.id,
      content: newComment.content,
      taskId: newComment.taskId,
      userName: name ?? 'Anonymous',
      userAvatar: avatarUrl ?? null,
      createdAt: newComment.createdAt,
    })

    return { success: true, comment: newComment }
  } catch (error) {
    console.error('Failed to add comment:', error)
    return { success: false, message: 'Failed to add comment.' }
  }
}

export async function getCommentsByTask(taskId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const result = await db.query.comments.findMany({
    where: eq(comments.taskId, taskId),
    with: {
      createdBy: true,
    },
    orderBy: (comments, { asc }) => [asc(comments.createdAt)],
  })

  return result
}
