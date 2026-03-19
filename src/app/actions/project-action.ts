// src/app/actions/project-action.ts
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { projects, organizations, memberships } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getOrCreateUser } from '@/lib/get-or-create-user'

// 获取当前用户的所有项目（跨组织）
export async function getUserProjects() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const clerkUser = await currentUser()
  if (!clerkUser) throw new Error('User not found')

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const name = clerkUser.fullName ?? clerkUser.username ?? undefined
  const avatarUrl = clerkUser.imageUrl ?? undefined
  const dbUser = await getOrCreateUser(userId, email, name, avatarUrl)

  // 获取用户加入的所有组织的项目
  const userMemberships = await db.query.memberships.findMany({
    where: eq(memberships.userId, dbUser.id),
    with: {
      organization: {
        with: {
          projects: {
            with: {
              createdBy: true,
            },
          },
        },
      },
    },
  })

  return userMemberships
}

// codeflicker-fix: AUTH-Issue-003/agek6tph1o7sjkmd3vvy
/**
 * 获取项目详情，同时校验当前用户是否为该项目所属组织的成员。
 * 若非成员则返回 null（防止越权读取任务数据）。
 */
export async function getProjectById(projectId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const clerkUser = await currentUser()
  if (!clerkUser) throw new Error('User not found')

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const name = clerkUser.fullName ?? clerkUser.username ?? undefined
  const avatarUrl = clerkUser.imageUrl ?? undefined
  const dbUser = await getOrCreateUser(userId, email, name, avatarUrl)

  // 先获取项目基础信息（含 organizationId）
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      createdBy: true,
      organization: true,
      tasks: {
        with: {
          assignedTo: true,
          createdBy: true,
        },
        orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
      },
    },
  })

  if (!project) return null

  // 校验当前用户是否为该项目所属组织的成员
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, dbUser.id),
      eq(memberships.organizationId, project.organizationId),
    ),
  })

  if (!membership) {
    // 当前用户不是该组织成员，拒绝访问
    throw new Error('Forbidden: you are not a member of this organization')
  }

  return project
}

/**
 * 验证用户是否为指定项目所属组织的成员（供 Pusher auth 等场景调用）
 */
export async function validateProjectMembership(
  dbUserId: string,
  projectId: string,
): Promise<boolean> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { organizationId: true },
  })

  if (!project) return false

  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, dbUserId),
      eq(memberships.organizationId, project.organizationId),
    ),
  })

  return !!membership
}

interface CreateProjectPayload {
  name: string
  description?: string
  organizationId: string
}

export async function createProject(payload: CreateProjectPayload) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const clerkUser = await currentUser()
  if (!clerkUser) throw new Error('User not found')

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const name = clerkUser.fullName ?? clerkUser.username ?? undefined
  const avatarUrl = clerkUser.imageUrl ?? undefined
  const dbUser = await getOrCreateUser(userId, email, name, avatarUrl)

  const { name: projectName, description, organizationId } = payload

  try {
    // 验证用户是否属于该组织
    const membership = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.userId, dbUser.id),
        eq(memberships.organizationId, organizationId),
      ),
    })

    if (!membership) {
      return { success: false, message: 'You are not a member of this organization.' }
    }

    const [newProject] = await db
      .insert(projects)
      .values({
        name: projectName,
        description: description ?? null,
        organizationId,
        createdById: dbUser.id,
      })
      .returning()

    revalidatePath('/dashboard')

    return { success: true, project: newProject }
  } catch (error) {
    console.error('Failed to create project:', error)
    return { success: false, message: 'Failed to create project.' }
  }
}

interface CreateOrganizationPayload {
  name: string
}

export async function createOrganization(payload: CreateOrganizationPayload) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const clerkUser = await currentUser()
  if (!clerkUser) throw new Error('User not found')

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const name = clerkUser.fullName ?? clerkUser.username ?? undefined
  const avatarUrl = clerkUser.imageUrl ?? undefined
  const dbUser = await getOrCreateUser(userId, email, name, avatarUrl)

  const { name: orgName } = payload

  try {
    // 使用事务：创建组织并将创建者加为 owner 成员
    let newOrg: typeof organizations.$inferSelect | undefined

    await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({ name: orgName, ownerId: dbUser.id })
        .returning()

      newOrg = org

      await tx.insert(memberships).values({
        userId: dbUser.id,
        organizationId: org.id,
        role: 'owner',
      })
    })

    revalidatePath('/dashboard')

    return { success: true, organization: newOrg }
  } catch (error) {
    console.error('Failed to create organization:', error)
    return { success: false, message: 'Failed to create organization.' }
  }
}

export async function getUserOrganizations() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const clerkUser = await currentUser()
  if (!clerkUser) throw new Error('User not found')

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const name = clerkUser.fullName ?? clerkUser.username ?? undefined
  const avatarUrl = clerkUser.imageUrl ?? undefined
  const dbUser = await getOrCreateUser(userId, email, name, avatarUrl)

  const userMemberships = await db.query.memberships.findMany({
    where: eq(memberships.userId, dbUser.id),
    with: {
      organization: {
        with: {
          projects: true,
        },
      },
    },
  })

  return userMemberships.map((m) => ({
    ...m.organization,
    role: m.role,
    joinedAt: m.joinedAt,
  }))
}
