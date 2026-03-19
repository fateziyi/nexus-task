// src/app/actions/task-action.ts
'use server'

import { revalidatePath } from 'next/cache'
import { pusherServer } from '@/lib/pusher'
import { db } from '@/db'
import { tasks } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getOrCreateUser } from '@/lib/get-or-create-user'

interface UpdateTaskStatusPayload {
  taskId: string
  status: 'todo' | 'in_progress' | 'done'
  projectId: string
}

export async function updateTaskStatus(payload: UpdateTaskStatusPayload) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { taskId, status, projectId } = payload

  try {
    const [updatedTask] = await db
      .update(tasks)
      .set({ status })
      .where(eq(tasks.id, taskId))
      .returning()

    if (!updatedTask) {
      throw new Error('Task not found or update failed')
    }

    // 触发 Pusher 实时事件
    const channelName = `presence-project-${projectId}`
    await pusherServer.trigger(channelName, 'task-updated', {
      taskId: updatedTask.id,
      status: updatedTask.status,
      updatedAt: updatedTask.updatedAt,
    })

    revalidatePath(`/projects/${projectId}`)

    return { success: true, task: updatedTask }
  } catch (error) {
    console.error('Failed to update task status:', error)
    return { success: false, message: 'Failed to update task status.' }
  }
}

interface CreateTaskPayload {
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high'
  status?: 'todo' | 'in_progress' | 'done'
  dueDate?: Date
  projectId: string
  assignedToId?: string
}

export async function createTask(payload: CreateTaskPayload) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const clerkUser = await currentUser()
  if (!clerkUser) throw new Error('User not found')

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const name = clerkUser.fullName ?? clerkUser.username ?? undefined
  const avatarUrl = clerkUser.imageUrl ?? undefined
  const dbUser = await getOrCreateUser(userId, email, name, avatarUrl)

  const { title, description, priority, status, dueDate, projectId, assignedToId } = payload

  try {
    const [newTask] = await db
      .insert(tasks)
      .values({
        title,
        description: description ?? null,
        priority: priority ?? 'medium',
        status: status ?? 'todo',
        dueDate: dueDate ?? null,
        projectId,
        assignedToId: assignedToId ?? null,
        createdById: dbUser.id,
      })
      .returning()

    // 触发 Pusher 实时事件，通知其他在线成员
    const channelName = `presence-project-${projectId}`
    await pusherServer.trigger(channelName, 'task-created', {
      task: newTask,
    })

    revalidatePath(`/projects/${projectId}`)

    return { success: true, task: newTask }
  } catch (error) {
    console.error('Failed to create task:', error)
    return { success: false, message: 'Failed to create task.' }
  }
}

export async function deleteTask(taskId: string, projectId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const clerkUser = await currentUser()
  if (!clerkUser) throw new Error('User not found')

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const dbUser = await getOrCreateUser(userId, email)

  try {
    // 仅允许任务创建者删除
    const [deletedTask] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.createdById, dbUser.id)))
      .returning()

    if (!deletedTask) {
      return { success: false, message: 'Task not found or permission denied.' }
    }

    const channelName = `presence-project-${projectId}`
    await pusherServer.trigger(channelName, 'task-deleted', {
      taskId,
    })

    revalidatePath(`/projects/${projectId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to delete task:', error)
    return { success: false, message: 'Failed to delete task.' }
  }
}

export async function getTasksByProject(projectId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const result = await db.query.tasks.findMany({
    where: eq(tasks.projectId, projectId),
    with: {
      assignedTo: true,
      createdBy: true,
    },
    orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
  })

  return result
}
